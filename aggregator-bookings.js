/* ==========================================================================
   FLEET AGGREGATOR BOOKINGS & DISPATCH MODULE LOGIC
   ========================================================================== */

const STATUS_CONFIG = {
    NO_TIMING: {
        label: 'No Timing',
        bg: '#F1F3F5',
        text: '#495057',
        border: '#DEE2E6',
        rowClass: 'row-no-timing',
        badgeClass: 'st-no-timing'
    },
    STATUS_NO: {
        label: 'Status NO',
        bg: '#FCE8D8',
        text: '#8A3B00',
        border: '#F7D5BA',
        rowClass: 'row-status-no',
        badgeClass: 'st-status-no'
    },
    STATUS_YES: {
        label: 'Status YES',
        bg: '#DDF4E4',
        text: '#136329',
        border: '#A8DFB8',
        rowClass: 'row-status-yes',
        badgeClass: 'st-status-yes'
    },
    STATUS_CANCEL: {
        label: 'Status CANCEL',
        bg: '#FAD2CF',
        text: '#9C1C14',
        border: '#F28B82',
        rowClass: 'row-status-cancel',
        badgeClass: 'st-status-cancel'
    },
    DR_DUTY_ACCPT: {
        label: 'DR DUTY ACCPT',
        bg: '#D6EEFC',
        text: '#0B5A8A',
        border: '#A6D8F5',
        rowClass: 'row-dr-duty-accpt',
        badgeClass: 'st-dr-duty-accpt'
    },
    DR_DUTY_START: {
        label: 'DR DUTY START',
        bg: '#B8DFF8',
        text: '#08436B',
        border: '#6BB8EB',
        rowClass: 'row-dr-duty-start',
        badgeClass: 'st-dr-duty-start'
    },
    DR_DUTY_CLOSE: {
        label: 'DR DUTY CLOSE',
        bg: '#9BC7E8',
        text: '#052F4E',
        border: '#4A90C2',
        rowClass: 'row-dr-duty-close',
        badgeClass: 'st-dr-duty-close'
    }
};

let bookingsList = [];
let selectedBookingFilterStatus = 'ALL';
let currentActiveBooking = null;
let currentDutyCloseBooking = null;

// =========================================================================
// 1. STATUS DERIVATION & COMPLETENESS RULES
// =========================================================================

function computeBookingStatusClient(b) {
    if (b.status === 'STATUS_CANCEL' || b.cancelled) {
        if (b.cancelReason && b.cancelReason.trim().length > 0) {
            return 'STATUS_CANCEL';
        }
    }

    if (b.dutyClosed || b.dutySlipUploaded || b.status === 'DR_DUTY_CLOSE') {
        return 'DR_DUTY_CLOSE';
    }

    if (b.dutyStarted || b.status === 'DR_DUTY_START') {
        return 'DR_DUTY_START';
    }

    const hasPlotting = Boolean(
        (b.vendorName || b.vendorId) &&
        b.vehicleNumber && String(b.vehicleNumber).trim().length > 0 &&
        b.driverName && String(b.driverName).trim().length > 0
    );

    if (hasPlotting && (b.driverAccepted === true || String(b.driverAccepted).toUpperCase() === 'YES')) {
        return 'DR_DUTY_ACCPT';
    }

    // Auto-recognize whether timing is present: true if repHours or reqTime is filled
    const hasTiming = Boolean(
        (b.reqTime && String(b.reqTime).trim().length > 0 && String(b.reqTime).trim() !== ':') ||
        (b.repHours && String(b.repHours).trim().length > 0)
    );

    if (!hasTiming) {
        return 'NO_TIMING';
    }

    const hasCore = Boolean(
        (b.clientName || b.clientId) &&
        b.travelDate &&
        b.guestName && String(b.guestName).trim().length > 0 &&
        b.vehicleType && String(b.vehicleType).trim().length > 0 &&
        b.packageType && String(b.packageType).trim().length > 0
    );

    if (!hasCore || !hasPlotting) {
        return 'STATUS_NO';
    }

    return 'STATUS_YES';
}

// Verification Rule: Can print duty slip only when status is Driver Accepted Duty or later (DR_DUTY_ACCPT, DR_DUTY_START, DR_DUTY_CLOSE)
function canPrintDutySlipBooking(b) {
    if (!b) return false;
    if (b.status === 'STATUS_CANCEL' || b.cancelled) return false;
    const st = computeBookingStatusClient(b);
    if (st === 'DR_DUTY_ACCPT' || st === 'DR_DUTY_START' || st === 'DR_DUTY_CLOSE') {
        return true;
    }
    if (b.driverAccepted === true || String(b.driverAccepted).toUpperCase() === 'YES' || b.dutyStarted || b.dutyClosed) {
        return true;
    }
    return false;
}

// Verification Rule: Close Duty & Generate Invoice is only applicable when booking status is DR Duty Started (or viewing closed/invoiced)
function canCloseDutyBooking(b) {
    if (!b) return false;
    if (b.status === 'STATUS_CANCEL' || b.cancelled) return false;
    const st = computeBookingStatusClient(b);
    if (st === 'DR_DUTY_START' || b.dutyStarted === true || st === 'DR_DUTY_CLOSE' || b.dutyClosed === true || b.isInvoiced === true) {
        return true;
    }
    return false;
}

function getMissingChecklist(b) {
    const missing = [];
    const hasTiming = Boolean(
        (b.reqTime && String(b.reqTime).trim().length > 0 && String(b.reqTime).trim() !== ':') ||
        (b.repHours && String(b.repHours).trim().length > 0)
    );
    if (!hasTiming) missing.push('Pickup Time');
    if (!b.clientName && !b.clientId) missing.push('Client Company');
    if (!b.travelDate) missing.push('Travel Date');
    if (!b.guestName || !String(b.guestName).trim()) missing.push('Guest Name');
    if (!b.vehicleType || !String(b.vehicleType).trim()) missing.push('Vehicle Type');
    if (!b.packageType || !String(b.packageType).trim()) missing.push('Package');
    if (!b.vendorName && !b.vendorId) missing.push('Vendor');
    if (!b.vehicleNumber || !String(b.vehicleNumber).trim()) missing.push('Car / Car No');
    if (!b.driverName || !String(b.driverName).trim()) missing.push('Driver Name');
    if (!b.driverAccepted) missing.push('Driver Acceptance');
    return missing;
}

function getStatusBadgeHtml(statusKey) {
    const conf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.NO_TIMING;
    return `<span class="st-badge ${conf.badgeClass}">${conf.label}</span>`;
}

// =========================================================================
// 2. LOAD & RENDER BOOKINGS CHART
// =========================================================================

async function loadBookings() {
    const fromDate = document.getElementById('bkFilterFromDate')?.value || '';
    const toDate = document.getElementById('bkFilterToDate')?.value || '';
    const clientId = document.getElementById('bkFilterClient')?.value || 'ALL';
    const location = document.getElementById('bkFilterLocation')?.value || 'ALL';
    const search = document.getElementById('bkFilterSearch')?.value?.trim() || '';

    let url = `${API_BASE}/aggregator/bookings?status=${selectedBookingFilterStatus}&`;
    if (fromDate) url += `fromDate=${fromDate}&`;
    if (toDate) url += `toDate=${toDate}&`;
    if (clientId !== 'ALL') url += `clientId=${encodeURIComponent(clientId)}&`;
    if (location !== 'ALL') url += `location=${encodeURIComponent(location)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetchAuth(url);
    if (res && res.success && Array.isArray(res.data)) {
        bookingsList = res.data;
    } else if (!bookingsList.length && typeof getFallbackBookings === 'function') {
        bookingsList = getFallbackBookings();
    }
    renderBookingStatusLegend();
    renderBookingsTable();
    updateBookingsSidebarBadge();
}

function updateBookingsSidebarBadge() {
    const badge = document.getElementById('countBadgeBookings');
    if (badge) badge.textContent = bookingsList.length;
}

function renderBookingStatusLegend() {
    const ribbon = document.getElementById('statusLegendRibbon');
    if (!ribbon) return;

    // Count bookings per status
    const counts = { ALL: bookingsList.length };
    Object.keys(STATUS_CONFIG).forEach(k => counts[k] = 0);
    bookingsList.forEach(b => {
        const st = b.status || 'NO_TIMING';
        if (counts[st] !== undefined) counts[st]++;
    });

    let html = `<div class="legend-title"><i class="bi bi-funnel-fill"></i> Filter Status:</div>`;
    html += `
        <div class="legend-pill ${selectedBookingFilterStatus === 'ALL' ? 'active' : ''}"
             style="background:#f1f5f9; color:#0f172a;" onclick="selectStatusFilter('ALL')">
            <span>ALL</span>
            <span class="counter">${counts.ALL}</span>
        </div>
    `;

    Object.entries(STATUS_CONFIG).forEach(([key, cfg]) => {
        const isActive = selectedBookingFilterStatus === key;
        html += `
            <div class="legend-pill ${cfg.badgeClass} ${isActive ? 'active' : ''}"
                 onclick="selectStatusFilter('${key}')" title="Click to filter by ${cfg.label}">
                <span>${cfg.label}</span>
                <span class="counter">${counts[key] || 0}</span>
            </div>
        `;
    });

    ribbon.innerHTML = html;
}

function selectStatusFilter(statusKey) {
    selectedBookingFilterStatus = statusKey;
    const filterSelect = document.getElementById('bkFilterStatusSelect');
    if (filterSelect) filterSelect.value = statusKey;
    loadBookings();
}

function findBookingInList(idOrNo) {
    if (!idOrNo) return null;
    const s = String(idOrNo).trim();
    const rawNo = s.replace('mock_bk_', '');
    return bookingsList.find(x => 
        (x._id && String(x._id) === s) ||
        (x.bookingNo && String(x.bookingNo) === s) ||
        (x.dutySlipNo && String(x.dutySlipNo) === s) ||
        (x.bookingNo && String(x.bookingNo) === rawNo) ||
        (x.dutySlipNo && String(x.dutySlipNo) === rawNo) ||
        (x._id && String(x._id).replace('mock_bk_', '') === rawNo)
    ) || null;
}

function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    if (!bookingsList.length) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:45px; color:#94a3b8;">
            <i class="bi bi-calendar-x" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
            No bookings found for the selected filters. Click "+ New Booking" to create one.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = bookingsList.map(b => {
        const st = b.status || 'NO_TIMING';
        const conf = STATUS_CONFIG[st] || STATUS_CONFIG.NO_TIMING;
        const rowClass = conf.rowClass;

        const travelDateFormatted = b.travelDate
            ? new Date(b.travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '<span style="color:#94a3b8;">Date pending</span>';

        const hasTiming = Boolean(
            (b.reqTime && String(b.reqTime).trim().length > 0 && String(b.reqTime).trim() !== ':') ||
            (b.repHours && String(b.repHours).trim().length > 0)
        );

        const reqTimeDisplay = !hasTiming
            ? '<span style="color:#64748b; font-style:italic;">No Timing</span>'
            : (b.reqTime || (b.repHours ? `${b.repHours}:${b.repMinutes || '00'}` : '<span style="color:#64748b; font-style:italic;">No Timing</span>'));

        const drAcptBadge = (b.driverAccepted === true || String(b.driverAccepted).toUpperCase() === 'YES')
            ? '<span class="badge badge-green" style="font-weight:700;">YES</span>'
            : '<span class="badge badge-gray" style="font-weight:600;">NO</span>';

        const bkIdentifier = b._id || b.bookingNo || b.dutySlipNo || '';

        const isStarted = Boolean(b.dutyStarted || st === 'DR_DUTY_START');
        const isClosed = Boolean(b.dutyClosed || st === 'DR_DUTY_CLOSE');
        const isAccepted = Boolean(b.driverAccepted === true || String(b.driverAccepted).toUpperCase() === 'YES' || st === 'DR_DUTY_ACCPT');

        let startDutyTitle = '';
        let startDutyStyle = '';
        let startDutyIcon = 'bi bi-play-circle-fill';

        if (isClosed) {
            startDutyTitle = 'Duty already completed & closed';
            startDutyStyle = 'color:#94a3b8; opacity:0.45; cursor:not-allowed;';
            startDutyIcon = 'bi bi-check2-all';
        } else if (isStarted) {
            startDutyTitle = 'Duty is running (DR Duty Started)';
            startDutyStyle = 'color:#0284c7; background:rgba(2,132,199,0.12); border-color:rgba(2,132,199,0.3);';
            startDutyIcon = 'bi bi-play-circle-fill';
        } else if (isAccepted) {
            startDutyTitle = 'Start Duty Manually (Driver Communicated)';
            startDutyStyle = 'color:#16a34a; background:rgba(22,163,74,0.12); border-color:rgba(22,163,74,0.35); font-weight:bold;';
            startDutyIcon = 'bi bi-play-circle-fill';
        } else {
            startDutyTitle = `Start Duty (Requires driver acceptance — Current: ${(STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st})`;
            startDutyStyle = 'color:#94a3b8; opacity:0.5;';
            startDutyIcon = 'bi bi-play-circle';
        }

        const isCloseAllowed = canCloseDutyBooking(b);
        const isPrintAllowed = canPrintDutySlipBooking(b);

        const dutyCloseTitle = isCloseAllowed 
            ? (b.dutyClosed || b.isInvoiced ? "View Closed Duty & Invoice" : "Duty Close & Generate Invoice")
            : `Close Duty & Generate Invoice (Requires status: DR Duty Started — Current: ${(STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st})`;
        const dutyCloseStyle = isCloseAllowed
            ? "color:#0284c7;"
            : "color:#94a3b8; opacity:0.45; cursor:pointer;";

        const printDutyTitle = isPrintAllowed
            ? "Print Duty Slip"
            : `Print Duty Slip (Requires status: Driver Accepted Duty — Current: ${(STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st})`;
        const printDutyStyle = isPrintAllowed
            ? "color:#ea580c;"
            : "color:#94a3b8; opacity:0.45; cursor:pointer;";

        return `
            <tr class="${rowClass}">
                <td style="font-weight:700; white-space:nowrap;">
                    <a href="javascript:void(0)" onclick="openBookingSheet('${bkIdentifier}')" style="color:#0f172a; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                        <i class="bi bi-box-arrow-up-right" style="font-size:0.75rem; color:#ea580c;"></i>
                        <span>#${b.dutySlipNo || b.bookingNo}</span>
                    </a>
                </td>
                <td style="white-space:nowrap;">${travelDateFormatted}</td>
                <td style="white-space:nowrap;">${reqTimeDisplay}</td>
                <td>
                    <strong style="color:#0f172a; font-size:0.86rem; display:block;">${b.clientName || '<span style="color:#dc2626;">Missing Client</span>'}</strong>
                    ${b.bookedBy ? `<span style="font-size:0.72rem; color:#64748b;">By: ${b.bookedBy}</span>` : ''}
                </td>
                <td>
                    <div style="font-weight:600; color:#0f172a;">${b.guestName || '<span style="color:#dc2626;">Missing Guest</span>'}</div>
                    ${b.guestPhone ? `<span style="font-size:0.72rem; color:#475569;">${b.guestPhone}</span>` : ''}
                </td>
                <td><span class="badge badge-gray">${b.vehicleType || '<span style="color:#dc2626;">Pending</span>'}</span></td>
                <td><span style="font-size:0.78rem; font-weight:600;">${b.packageType || '-'}</span></td>
                <td>
                    ${b.vehicleNumber ? `<strong style="font-family:monospace; color:#0f172a;">${b.vehicleNumber}</strong>` : '<span style="color:#94a3b8; font-size:0.75rem;">Not Plotted</span>'}
                </td>
                <td>
                    ${b.driverName ? `<div>${b.driverName}</div>` : '<span style="color:#94a3b8; font-size:0.75rem;">Not Plotted</span>'}
                </td>
                <td>${getStatusBadgeHtml(st)}</td>
                <td style="text-align:center;">${drAcptBadge}</td>
                <td><span style="font-size:0.78rem; color:#64748b;">${b.location || 'Pune'}</span></td>
                <td style="text-align:right; white-space:nowrap;">
                    <div style="display:inline-flex; gap:4px;">
                        <button class="btn btn-outline btn-icon" onclick="openBookingSheet('${bkIdentifier}')" title="Open Full Booking & Plotting Sheet">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-outline btn-icon" onclick="startDutyManually('${bkIdentifier}')" title="${startDutyTitle}" style="${startDutyStyle}">
                            <i class="${startDutyIcon}"></i>
                        </button>
                        <button class="btn btn-outline btn-icon" onclick="openDutyCloseModal('${bkIdentifier}')" title="${dutyCloseTitle}" style="${dutyCloseStyle}">
                            <i class="bi bi-receipt-cutoff"></i>
                        </button>
                        <button class="btn btn-outline btn-icon" onclick="openPrintDutySlipModal('${bkIdentifier}')" title="${printDutyTitle}" style="${printDutyStyle}">
                            <i class="bi bi-printer"></i>
                        </button>
                        <button class="btn btn-outline btn-icon" onclick="openCommunicationModal('${bkIdentifier}')" title="Stage-Wise Email & WhatsApp Messages" style="color:#2563eb;">
                            <i class="bi bi-chat-dots-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Populate Client Company Dropdown inside filter & forms
function populateClientCompanyDropdowns() {
    const filterSelect = document.getElementById('bkFilterClient');
    const formSelect = document.getElementById('sheetClientSelect');
    if (!companiesList.length) return;

    let filterOptions = `<option value="ALL">All Clients</option>`;
    let formOptions = `<option value="">-- Select Client Company --</option>`;

    companiesList.forEach(c => {
        filterOptions += `<option value="${c._id}">${c.companyName}</option>`;
        formOptions += `<option value="${c._id}" data-state="${c.stateCode}" data-credit="${c.creditPeriodDays}">${c.companyName}</option>`;
    });

    if (filterSelect) filterSelect.innerHTML = filterOptions;
    if (formSelect) formSelect.innerHTML = formOptions;
}

// Populate Vendor Dropdown inside Plotting section
function populateVendorDropdown() {
    const vendorSelect = document.getElementById('sheetVendorSelect');
    if (!vendorSelect || !vendorsList.length) return;

    let options = `<option value="">-- Select Vendor / Supplier --</option>`;
    vendorsList.forEach(v => {
        options += `<option value="${v._id}">${v.vendorName} (${v.contactPerson})</option>`;
    });
    options += `<option value="ADHOC">+ Ad-hoc / Other Supplier</option>`;
    vendorSelect.innerHTML = options;
}

// =========================================================================
// 3. BOOKING & PLOTTING DETAIL SHEET MODAL
// =========================================================================

function openNewBookingSheet() {
    currentActiveBooking = {
        _id: '',
        bookingNo: '',
        dutySlipNo: '',
        status: 'NO_TIMING',
        isManualStatus: false,
        noTiming: true,
        travelDate: new Date().toISOString().split('T')[0],
        extraGuests: [],
        driverAccepted: false,
        dutyStarted: false,
        dutyClosed: false
    };

    renderBookingSheetForm(currentActiveBooking);
    const hiddenIdEl = document.getElementById('sheetHiddenId');
    if (hiddenIdEl) hiddenIdEl.value = '';
    openModal('bookingDetailModal');
}

function openBookingSheet(bookingId) {
    if (!bookingId) return;
    const b = findBookingInList(bookingId);
    if (!b) return;

    currentActiveBooking = JSON.parse(JSON.stringify(b));
    renderBookingSheetForm(currentActiveBooking);
    openModal('bookingDetailModal');
}

function setSelectOptionValue(selectId, value, defaultVal = '') {
    const el = document.getElementById(selectId);
    if (!el) return;
    const targetVal = String(value || defaultVal || '').trim();
    if (!targetVal) {
        el.value = '';
        return;
    }
    let found = false;
    for (let i = 0; i < el.options.length; i++) {
        if (el.options[i].value.toLowerCase() === targetVal.toLowerCase() || el.options[i].text.toLowerCase() === targetVal.toLowerCase()) {
            el.selectedIndex = i;
            el.value = el.options[i].value;
            found = true;
            break;
        }
    }
    if (!found) {
        const opt = document.createElement('option');
        opt.value = targetVal;
        opt.textContent = targetVal;
        el.appendChild(opt);
        el.value = targetVal;
    }
}
const setPackageSelectValue = setSelectOptionValue;

function renderBookingSheetForm(b) {
    // Populate dropdowns first
    populateClientCompanyDropdowns();
    populateVendorDropdown();

    // Banner Details
    const dsNo = (b.dutySlipNo && b.dutySlipNo !== 'AUTO') ? b.dutySlipNo : ((b.bookingNo && b.bookingNo !== 'AUTO') ? b.bookingNo : 'AUTO');
    document.getElementById('sheetDsNoDisplay').textContent = dsNo === 'AUTO' ? 'Next Sequence' : `#${dsNo}`;
    const realId = (b._id && b._id !== 'AUTO') ? b._id : ((b.bookingNo && b.bookingNo !== 'AUTO') ? b.bookingNo : '');
    document.getElementById('sheetHiddenId').value = realId;

    // Quick Driver Acceptance in Header
    const drAcptToggle = document.getElementById('sheetHeaderDrAcpt');
    if (drAcptToggle) drAcptToggle.checked = Boolean(b.driverAccepted);
    const dutyStartedHeaderToggle = document.getElementById('sheetHeaderDutyStarted');
    if (dutyStartedHeaderToggle) dutyStartedHeaderToggle.checked = Boolean(b.dutyStarted);

    // Form fields
    document.getElementById('sheetTravelDate').value = b.travelDate ? b.travelDate.split('T')[0] : '';
    document.getElementById('sheetEndDate').value = b.endDate ? b.endDate.split('T')[0] : '';

    document.getElementById('sheetRepHours').value = b.repHours || (b.reqTime ? b.reqTime.split(':')[0] : '');
    document.getElementById('sheetRepMinutes').value = b.repMinutes || (b.reqTime && b.reqTime.includes(':') ? b.reqTime.split(':')[1] : '');
    document.getElementById('sheetOffHours').value = b.offHours || '';
    document.getElementById('sheetOffMinutes').value = b.offMinutes || '';
    const noTimingEl = document.getElementById('sheetNoTimingCheck');
    if (noTimingEl) noTimingEl.checked = Boolean(b.noTiming);
    document.getElementById('sheetTimingNotes').value = b.timingNotes || '';

    // Client
    if (b.clientId) {
        document.getElementById('sheetClientSelect').value = b.clientId;
    } else {
        const match = companiesList.find(c => c.companyName === b.clientName);
        if (match) document.getElementById('sheetClientSelect').value = match._id;
    }
    setSelectOptionValue('sheetLocation', b.location, 'Pune');
    document.getElementById('sheetBookedBy').value = b.bookedBy || '';
    document.getElementById('sheetBookedByPhone').value = b.bookedByPhone || '';

    // Vehicle & Package
    document.getElementById('sheetVehicleType').value = b.vehicleType || '';
    setPackageSelectValue('sheetPackageType', b.packageType);
    document.getElementById('sheetDestination').value = b.destination || 'Local Disposal';
    document.getElementById('sheetDutyRefNo').value = b.dutyRefNo || '';
    document.getElementById('sheetRemarks').value = b.remarks || '';

    // Guest Info
    document.getElementById('sheetGuestName').value = b.guestName || '';
    document.getElementById('sheetGuestPhone').value = b.guestPhone || '';
    document.getElementById('sheetReportingAddr').value = b.reportingAddress || '';
    document.getElementById('sheetDropAddr').value = b.dropAddress || '';

    // Passenger Rows
    renderPassengerRows(b.extraGuests || []);

    // Plotting Details
    if (b.vendorId) {
        document.getElementById('sheetVendorSelect').value = b.vendorId;
    } else {
        document.getElementById('sheetVendorSelect').value = b.vendorName ? 'ADHOC' : '';
    }
    setPackageSelectValue('sheetVendorPackage', b.vendorPackage);
    document.getElementById('sheetVendorPenalty').value = b.vendorPenalty || 0;
    document.getElementById('sheetVendorFixRate').value = b.vendorFixRate || 0;
    document.getElementById('sheetVendorKmRate').value = b.vendorKmRate || 0;
    document.getElementById('sheetCashToVendor').value = b.cashToVendor || 0;
    document.getElementById('sheetDriverName').value = b.driverName || '';
    document.getElementById('sheetDriverPhone').value = b.driverPhone || '';
    document.getElementById('sheetVehicleNumber').value = b.vehicleNumber || '';
    document.getElementById('sheetVehicleSend').value = b.vehicleSend || '';
    document.getElementById('sheetDrAcptToggle').checked = Boolean(b.driverAccepted);
    const dutyStartedFormToggle = document.getElementById('sheetDutyStartedToggle');
    if (dutyStartedFormToggle) dutyStartedFormToggle.checked = Boolean(b.dutyStarted);
    document.getElementById('sheetPaymentMode').value = b.paymentMode || 'CREDIT';

    // Inline Audit Footer
    const createdBy = b.createdBy || 'admin';
    const createdAtStr = b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : 'Just now';
    const updatedBy = b.updatedBy || createdBy;
    const updatedAtStr = b.updatedAt ? new Date(b.updatedAt).toLocaleString('en-IN') : createdAtStr;
    document.getElementById('sheetAuditFooter').textContent = `Created by ${createdBy} @ ${createdAtStr} | Last updated by ${updatedBy} @ ${updatedAtStr}`;

    // Update real-time status pill & completeness checklist
    updateSheetLiveCompleteness();
}

function updateSheetLiveCompleteness() {
    const current = collectSheetFormData();
    const computed = computeBookingStatusClient(current);
    const checklist = getMissingChecklist(current);

    // Update Banner Badge
    const bannerBadge = document.getElementById('sheetHeaderStatusBadge');
    if (bannerBadge) bannerBadge.innerHTML = getStatusBadgeHtml(computed);

    // Update Live Pill
    const livePill = document.getElementById('sheetLiveComputedPill');
    if (livePill) livePill.innerHTML = getStatusBadgeHtml(computed);

    // Checklist feedback
    const checklistBox = document.getElementById('sheetChecklistFeedback');
    if (checklistBox) {
        if (checklist.length === 0 || computed === 'STATUS_YES' || computed === 'DR_DUTY_ACCPT' || computed === 'DR_DUTY_START' || computed === 'DR_DUTY_CLOSE') {
            checklistBox.className = 'checklist-badge ready';
            checklistBox.innerHTML = `<i class="bi bi-check-circle-fill"></i> Complete & Ready for Dispatch`;
        } else {
            checklistBox.className = 'checklist-badge';
            checklistBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Missing for Ready: <strong>${checklist.join(', ')}</strong>`;
        }
    }

    // Update Header Print Duty Slip button status
    const printBtn = document.getElementById('sheetBtnPrintDutySlip');
    if (printBtn) {
        const isPrintAllowed = canPrintDutySlipBooking(current);
        if (isPrintAllowed) {
            printBtn.style.opacity = '1';
            printBtn.title = 'Print Duty Slip';
        } else {
            printBtn.style.opacity = '0.55';
            printBtn.title = `Print Duty Slip (Requires status: Driver Accepted Duty — Current: ${(STATUS_CONFIG[computed] && STATUS_CONFIG[computed].label) || computed})`;
        }
    }

    // Update Header Start Duty button status
    const btnStart = document.getElementById('sheetBtnStartDuty');
    const btnStartText = document.getElementById('sheetBtnStartDutyText');
    if (btnStart) {
        if (current.dutyClosed) {
            btnStart.style.background = 'rgba(148, 163, 184, 0.15)';
            btnStart.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            btnStart.style.opacity = '0.6';
            if (btnStartText) btnStartText.textContent = 'Duty Closed';
            btnStart.title = 'Duty already completed and closed';
        } else if (current.dutyStarted) {
            btnStart.style.background = 'rgba(2, 132, 199, 0.25)';
            btnStart.style.borderColor = 'rgba(2, 132, 199, 0.5)';
            btnStart.style.opacity = '1';
            if (btnStartText) btnStartText.textContent = 'Duty Running';
            btnStart.title = 'Duty is started and currently live on the road';
        } else {
            btnStart.style.background = 'rgba(22, 163, 74, 0.2)';
            btnStart.style.borderColor = 'rgba(22, 163, 74, 0.5)';
            btnStart.style.opacity = '1';
            if (btnStartText) btnStartText.textContent = 'Start Duty';
            btnStart.title = 'Start Duty Manually (Driver Communicated)';
        }
    }
}

function collectSheetFormData() {
    const clientSelect = document.getElementById('sheetClientSelect');
    const selectedClientName = clientSelect.selectedIndex > 0 ? clientSelect.options[clientSelect.selectedIndex].text : '';

    const repHours = document.getElementById('sheetRepHours')?.value?.trim() || '';
    const repMinutes = document.getElementById('sheetRepMinutes')?.value?.trim() || '';
    const reqTime = repHours ? `${repHours}:${repMinutes || '00'}` : '';
    // System auto-detects timing: noTiming is true if reporting hours are empty
    const noTiming = !repHours;

    const vendorSelect = document.getElementById('sheetVendorSelect');
    const vendorId = vendorSelect?.value || '';
    const vendorName = vendorId === 'ADHOC' ? 'Ad-hoc Vendor' : (vendorSelect?.selectedIndex > 0 ? vendorSelect.options[vendorSelect.selectedIndex].text.split(' (')[0] : '');

    const rawHiddenId = document.getElementById('sheetHiddenId')?.value?.trim() || '';
    const rawActiveId = (currentActiveBooking && (currentActiveBooking._id || currentActiveBooking.bookingNo)) || '';
    const bookingId = (rawHiddenId && rawHiddenId !== 'AUTO') 
        ? rawHiddenId 
        : ((rawActiveId && rawActiveId !== 'AUTO') ? rawActiveId : '');

    return {
        _id: bookingId || undefined,
        travelDate: document.getElementById('sheetTravelDate')?.value || null,
        endDate: document.getElementById('sheetEndDate')?.value || null,
        repHours,
        repMinutes,
        reqTime,
        offHours: document.getElementById('sheetOffHours')?.value?.trim() || '',
        offMinutes: document.getElementById('sheetOffMinutes')?.value?.trim() || '',
        noTiming,
        timingNotes: document.getElementById('sheetTimingNotes')?.value?.trim() || '',
        clientId: clientSelect?.value || '',
        clientName: selectedClientName,
        location: document.getElementById('sheetLocation')?.value?.trim() || 'Pune',
        bookedBy: document.getElementById('sheetBookedBy')?.value?.trim() || '',
        bookedByPhone: document.getElementById('sheetBookedByPhone')?.value?.trim() || '',
        vehicleType: document.getElementById('sheetVehicleType')?.value?.trim() || '',
        packageType: document.getElementById('sheetPackageType')?.value?.trim() || '',
        destination: document.getElementById('sheetDestination')?.value?.trim() || 'Local Disposal',
        dutyRefNo: document.getElementById('sheetDutyRefNo')?.value?.trim() || '',
        remarks: document.getElementById('sheetRemarks')?.value?.trim() || '',
        guestName: document.getElementById('sheetGuestName')?.value?.trim() || '',
        guestPhone: document.getElementById('sheetGuestPhone')?.value?.trim() || '',
        reportingAddress: document.getElementById('sheetReportingAddr')?.value?.trim() || '',
        dropAddress: document.getElementById('sheetDropAddr')?.value?.trim() || '',
        extraGuests: collectPassengerRows(),
        vendorId,
        vendorName,
        vendorPackage: document.getElementById('sheetVendorPackage')?.value?.trim() || '',
        vendorPenalty: Number(document.getElementById('sheetVendorPenalty')?.value || 0),
        vendorFixRate: Number(document.getElementById('sheetVendorFixRate')?.value || 0),
        vendorKmRate: Number(document.getElementById('sheetVendorKmRate')?.value || 0),
        cashToVendor: Number(document.getElementById('sheetCashToVendor')?.value || 0),
        driverName: document.getElementById('sheetDriverName')?.value?.trim() || '',
        driverPhone: document.getElementById('sheetDriverPhone')?.value?.trim() || '',
        vehicleNumber: document.getElementById('sheetVehicleNumber')?.value?.trim()?.toUpperCase() || '',
        vehicleSend: document.getElementById('sheetVehicleSend')?.value?.trim() || '',
        driverAccepted: document.getElementById('sheetDrAcptToggle')?.checked || false,
        dutyStarted: document.getElementById('sheetDutyStartedToggle')?.checked || false,
        paymentMode: document.getElementById('sheetPaymentMode')?.value || 'CREDIT'
    };
}

// Passenger table handlers
function renderPassengerRows(guests = []) {
    const tbody = document.getElementById('sheetPassengerTbody');
    if (!tbody) return;

    if (!guests.length) {
        guests = [{ srNo: 1, guestName: '', reporting: '', drop: '', phone: '', email: '', empId: '', costCenter: '', taskCode: '', reqId: '' }];
    }

    tbody.innerHTML = guests.map((g, idx) => `
        <tr data-row="${idx}">
            <td style="text-align:center;">${idx + 1}</td>
            <td><input type="text" class="pass-guest" value="${g.guestName || ''}" placeholder="Guest Name"></td>
            <td><input type="text" class="pass-rep" value="${g.reporting || ''}" placeholder="Pickup Address"></td>
            <td><input type="text" class="pass-drop" value="${g.drop || ''}" placeholder="Drop Address"></td>
            <td><input type="text" class="pass-phone" value="${g.phone || ''}" placeholder="Phone"></td>
            <td><input type="text" class="pass-email" value="${g.email || ''}" placeholder="Email"></td>
            <td><input type="text" class="pass-empid" value="${g.empId || ''}" placeholder="Emp ID"></td>
            <td><input type="text" class="pass-cc" value="${g.costCenter || ''}" placeholder="Cost Center"></td>
            <td><input type="text" class="pass-tc" value="${g.taskCode || ''}" placeholder="Task Code"></td>
            <td><input type="text" class="pass-reqid" value="${g.reqId || ''}" placeholder="Req ID"></td>
            <td style="text-align:center;">
                <button type="button" class="btn btn-outline btn-icon" style="color:#ef4444;" onclick="removePassengerRow(${idx})"><i class="bi bi-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function addPassengerRow() {
    const guests = collectPassengerRows();
    guests.push({ srNo: guests.length + 1, guestName: '', reporting: '', drop: '', phone: '', email: '', empId: '', costCenter: '', taskCode: '', reqId: '' });
    renderPassengerRows(guests);
}

function removePassengerRow(index) {
    let guests = collectPassengerRows();
    if (guests.length <= 1) return;
    guests.splice(index, 1);
    renderPassengerRows(guests);
}

function collectPassengerRows() {
    const tbody = document.getElementById('sheetPassengerTbody');
    if (!tbody) return [];
    const rows = tbody.querySelectorAll('tr');
    const guests = [];
    rows.forEach((r, idx) => {
        guests.push({
            srNo: idx + 1,
            guestName: r.querySelector('.pass-guest')?.value || '',
            reporting: r.querySelector('.pass-rep')?.value || '',
            drop: r.querySelector('.pass-drop')?.value || '',
            phone: r.querySelector('.pass-phone')?.value || '',
            email: r.querySelector('.pass-email')?.value || '',
            empId: r.querySelector('.pass-empid')?.value || '',
            costCenter: r.querySelector('.pass-cc')?.value || '',
            taskCode: r.querySelector('.pass-tc')?.value || '',
            reqId: r.querySelector('.pass-reqid')?.value || ''
        });
    });
    return guests;
}

// Quick Communication buttons from Sheet
function sendBookerSms() {
    const phone = document.getElementById('sheetBookedByPhone')?.value?.trim();
    if (!phone) { showToast('No Booked By phone number entered', 'error'); return; }
    window.open(`sms:${phone}?body=${encodeURIComponent(`Hello, your booking with Wings Travels is logged.`)}`);
}

function sendBookerWhatsApp() {
    const phone = (document.getElementById('sheetBookedByPhone')?.value || '').replace(/[^0-9]/g, '');
    if (!phone) { showToast('No Booked By phone number entered', 'error'); return; }
    const guest = document.getElementById('sheetGuestName')?.value || 'Guest';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, your cab booking for ${guest} is received by Wings Travels.`)}`, '_blank');
}

function sendGuestSms() {
    const phone = document.getElementById('sheetGuestPhone')?.value?.trim();
    if (!phone) { showToast('No Guest mobile number entered', 'error'); return; }
    window.open(`sms:${phone}?body=${encodeURIComponent(`Greetings from Wings Travels. Your cab booking is confirmed.`)}`);
}

function sendGuestWhatsApp() {
    if (typeof openCommunicationModalFromSheet === 'function') {
        openCommunicationModalFromSheet('CLIENT');
    } else {
        const phone = (document.getElementById('sheetGuestPhone')?.value || '').replace(/[^0-9]/g, '');
        if (!phone) { showToast('No Guest mobile number entered', 'error'); return; }
        const date = document.getElementById('sheetTravelDate')?.value || '';
        const time = document.getElementById('sheetRepHours')?.value ? `${document.getElementById('sheetRepHours').value}:${document.getElementById('sheetRepMinutes').value || '00'}` : '';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Greetings! Wings Travels cab is booked for ${date} at ${time}. Driver details will follow.`)}`, '_blank');
    }
}

function sendDriverWhatsApp() {
    if (typeof openCommunicationModalFromSheet === 'function') {
        openCommunicationModalFromSheet('DRIVER');
    } else {
        const phone = (document.getElementById('sheetDriverPhone')?.value || '').replace(/[^0-9]/g, '');
        if (!phone) { showToast('No Driver mobile number entered', 'error'); return; }
        const guest = document.getElementById('sheetGuestName')?.value || 'Guest';
        const gPhone = document.getElementById('sheetGuestPhone')?.value || '';
        const addr = document.getElementById('sheetReportingAddr')?.value || '';
        const date = document.getElementById('sheetTravelDate')?.value || '';
        const time = document.getElementById('sheetRepHours')?.value ? `${document.getElementById('sheetRepHours').value}:${document.getElementById('sheetRepMinutes').value || '00'}` : '';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Wings Travels Duty Slip: Passenger: ${guest} (${gPhone}). Pickup: ${addr}. Date: ${date} Time: ${time}. Please accept duty.`)}`, '_blank');
    }
}

// Save / Update Booking from Sheet
async function saveBookingFromSheet(resetToAuto = false) {
    const data = collectSheetFormData();
    const rawExistingId = data._id || (currentActiveBooking && (currentActiveBooking._id || currentActiveBooking.bookingNo));
    const existingId = (rawExistingId && rawExistingId !== 'AUTO') ? rawExistingId : null;
    const isNew = !existingId;
    if (isNew) {
        delete data._id;
        if (data.bookingNo === 'AUTO') delete data.bookingNo;
        if (data.dutySlipNo === 'AUTO') delete data.dutySlipNo;
    }
    const url = isNew ? `${API_BASE}/aggregator/bookings` : `${API_BASE}/aggregator/bookings/${encodeURIComponent(existingId)}`;
    const method = isNew ? 'POST' : 'PUT';

    if (resetToAuto) {
        data.resetToAuto = true;
    }

    const res = await fetchAuth(url, { method, body: JSON.stringify(data) });
    if (res && res.success) {
        showToast(res.message);

        // Display non-blocking warnings if any
        const warningBox = document.getElementById('sheetWarningAlertBox');
        if (warningBox && res.warnings && res.warnings.length > 0) {
            warningBox.style.display = 'block';
            warningBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${res.warnings.join('<br>')}`;
        } else if (warningBox) {
            warningBox.style.display = 'none';
        }

        closeModal('bookingDetailModal');
        currentActiveBooking = null;
        await loadBookings();
    } else {
        showToast(res ? res.message : 'Error saving booking', 'error');
    }
}

// Copy booking button inside sheet
async function copyCurrentActiveBooking() {
    if (!currentActiveBooking || !currentActiveBooking._id) {
        showToast('Please save the booking first before copying', 'error');
        return;
    }
    const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${currentActiveBooking._id}/copy`, { method: 'POST' });
    if (res && res.success) {
        showToast(res.message);
        closeModal('bookingDetailModal');
        loadBookings();
    } else {
        showToast(res ? res.message : 'Failed to copy booking', 'error');
    }
}

// Cancel booking button inside sheet
function promptCancelCurrentBooking() {
    if (!currentActiveBooking || !currentActiveBooking._id) {
        showToast('Booking is not saved yet', 'error');
        return;
    }
    document.getElementById('cancelBookingTargetNo').textContent = currentActiveBooking.dutySlipNo || currentActiveBooking.bookingNo;
    document.getElementById('cancelReasonInput').value = '';
    openModal('cancelBookingModal');
}

async function submitBookingCancellation() {
    const reason = document.getElementById('cancelReasonInput')?.value?.trim();
    if (!reason) {
        showToast('Cancellation reason is required', 'error');
        return;
    }

    const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${currentActiveBooking._id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancelReason: reason })
    });

    if (res && res.success) {
        showToast(res.message);
        closeModal('cancelBookingModal');
        closeModal('bookingDetailModal');
        loadBookings();
    } else {
        showToast(res ? res.message : 'Error cancelling booking', 'error');
    }
}

// =========================================================================
// 3.5. MANUAL DUTY START (DISPATCHER & DRIVER COMMUNICATION)
// =========================================================================

async function startDutyManually(bookingId) {
    const b = findBookingInList(bookingId);
    if (!b) return;

    if (b.status === 'STATUS_CANCEL' || b.cancelled) {
        showToast('Cannot start duty on a cancelled booking', 'error');
        return;
    }

    if (b.dutyClosed || b.status === 'DR_DUTY_CLOSE') {
        showToast('Duty is already completed and closed', 'info');
        return;
    }

    if (b.dutyStarted || b.status === 'DR_DUTY_START') {
        showToast(`Duty #${b.dutySlipNo || b.bookingNo} is already started and in progress`, 'info');
        return;
    }

    const hasPlotting = Boolean(b.vehicleNumber && b.driverName);
    if (!hasPlotting) {
        showToast('Please assign vehicle and driver before starting duty', 'warning');
        openBookingSheet(bookingId);
        return;
    }

    const dsNo = b.dutySlipNo || b.bookingNo;
    const driverMsg = b.driverName ? `with chauffeur ${b.driverName}` : '';
    const confirmStart = confirm(`Start Duty for Booking #${dsNo} ${driverMsg}?\n\nThis will mark the duty as "DR DUTY START" so the trip is officially live and can later be closed with returned readings.`);
    if (!confirmStart) return;

    let res = await fetchAuth(`${API_BASE}/aggregator/bookings/${b._id || b.bookingNo}/start-duty`, {
        method: 'POST',
        body: JSON.stringify({ dutyStarted: true, driverAccepted: true })
    });

    if (!res || !res.success) {
        // Fallback to PUT
        res = await fetchAuth(`${API_BASE}/aggregator/bookings/${b._id || b.bookingNo}`, {
            method: 'PUT',
            body: JSON.stringify({ dutyStarted: true, driverAccepted: true, resetToAuto: true })
        });
    }

    if (res && res.success) {
        showToast(res.message || `Duty #${dsNo} started successfully!`);
        b.dutyStarted = true;
        b.driverAccepted = true;
        b.status = 'DR_DUTY_START';
        await loadBookings();
    } else {
        showToast(res ? res.message : 'Error starting duty', 'error');
    }
}

async function startDutyFromSheet() {
    if (!currentActiveBooking) return;

    if (currentActiveBooking.dutyClosed) {
        showToast('Duty is already closed', 'info');
        return;
    }

    const dutyCheck = document.getElementById('sheetDutyStartedToggle');
    const headerDutyCheck = document.getElementById('sheetHeaderDutyStarted');
    const drAcptCheck = document.getElementById('sheetDrAcptToggle');
    const headerDrAcpt = document.getElementById('sheetHeaderDrAcpt');

    if (dutyCheck?.checked) {
        showToast('Duty is already marked as started', 'info');
        return;
    }

    if (dutyCheck) dutyCheck.checked = true;
    if (headerDutyCheck) headerDutyCheck.checked = true;
    if (drAcptCheck) drAcptCheck.checked = true;
    if (headerDrAcpt) headerDrAcpt.checked = true;

    updateSheetLiveCompleteness();

    const realId = currentActiveBooking._id || currentActiveBooking.bookingNo;
    if (realId && realId !== 'AUTO') {
        let res = await fetchAuth(`${API_BASE}/aggregator/bookings/${realId}/start-duty`, {
            method: 'POST',
            body: JSON.stringify({ dutyStarted: true, driverAccepted: true })
        });
        if (!res || !res.success) {
            res = await fetchAuth(`${API_BASE}/aggregator/bookings/${realId}`, {
                method: 'PUT',
                body: JSON.stringify({ dutyStarted: true, driverAccepted: true, resetToAuto: true })
            });
        }
        if (res && res.success) {
            showToast(`Duty #${currentActiveBooking.dutySlipNo || currentActiveBooking.bookingNo} started successfully!`);
            currentActiveBooking.dutyStarted = true;
            currentActiveBooking.driverAccepted = true;
            currentActiveBooking.status = 'DR_DUTY_START';
            loadBookings();
            return;
        }
    }

    showToast('Duty marked as Started. Click "Save Booking Sheet" to persist changes.', 'success');
}

// =========================================================================
// 4. DUTY CLOSE & SAME-NUMBER INVOICE GENERATION
// =========================================================================

async function openDutyCloseModal(bookingId) {
    const b = findBookingInList(bookingId);
    if (!b) return;

    if (!canCloseDutyBooking(b)) {
        const st = computeBookingStatusClient(b);
        const stLabel = (STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st;
        const msg = `Close Duty & Generate Invoice is only applicable when booking status is "DR Duty Started". Current status: ${stLabel}.`;
        if (typeof showToast === 'function') {
            showToast(msg, 'warning');
        } else {
            alert(msg);
        }
        return;
    }

    currentDutyCloseBooking = b;
    const dsNo = b.dutySlipNo || b.bookingNo;

    document.getElementById('dcModalTitle').innerHTML = `<i class="bi bi-receipt-cutoff"></i> Close Duty & Generate Invoice — #${dsNo}`;
    document.getElementById('dcBookingNoDisplay').textContent = dsNo;
    document.getElementById('dcTargetInvoiceNoDisplay').textContent = dsNo; // EXACT SAME NUMBER!
    document.getElementById('dcClientDisplay').textContent = b.clientName || 'Client';
    document.getElementById('dcGuestDisplay').textContent = b.guestName || 'Guest';
    document.getElementById('dcVehicleDisplay').textContent = `${b.vehicleNumber || ''} (${b.vehicleType || ''})`;
    document.getElementById('dcDriverDisplay').textContent = b.driverName || 'Driver';

    // Populate Readings
    const rd = b.dutyCloseReadings || {};
    document.getElementById('dcGarageOutKm').value = rd.garageOutKm || '';
    document.getElementById('dcGarageOutTime').value = rd.garageOutTime || '';
    document.getElementById('dcReportingKm').value = rd.reportingKm || '';
    document.getElementById('dcReportingTime').value = rd.reportingTime || '';
    document.getElementById('dcReleasingKm').value = rd.releasingKm || '';
    document.getElementById('dcReleasingTime').value = rd.releasingTime || '';
    document.getElementById('dcGarageInKm').value = rd.garageInKm || '';
    document.getElementById('dcGarageInTime').value = rd.garageInTime || '';

    document.getElementById('dcTotalKms').value = rd.totalKms || (rd.releasingKm && rd.reportingKm ? Math.max(0, rd.releasingKm - rd.reportingKm) : 80);
    document.getElementById('dcTotalHours').value = rd.totalHours || 8.0;
    document.getElementById('dcTotalDays').value = rd.totalDays || 1;
    document.getElementById('dcTotalNights').value = rd.totalNights || 0;
    document.getElementById('dcDriverAllowance').value = rd.driverAllowance || 0;
    document.getElementById('dcLateNight').value = rd.lateNightCharges || 0;
    document.getElementById('dcPermit').value = rd.permitCharges || 0;
    document.getElementById('dcFuelSurcharge').value = rd.fuelSurcharge || 0;
    document.getElementById('dcToll').value = rd.tollCharges || 0;
    document.getElementById('dcParking').value = rd.parkingCharges || 0;
    document.getElementById('dcGuestSignConfirmed').checked = Boolean(rd.guestSignatureConfirmed);

    // Duty slip uploaded status
    updateDutySlipFileStatusDisplay(b);

    // If already invoiced, show invoice view
    if (b.isInvoiced && b.invoiceDetails && b.invoiceDetails.grandTotal) {
        renderGeneratedInvoiceSection(b.invoiceDetails, b);
    } else {
        document.getElementById('generatedInvoiceContainer').style.display = 'none';
        document.getElementById('btnSubmitCloseDuty').style.display = 'inline-flex';
    }

    openModal('dutyCloseModal');
}

function updateDutySlipFileStatusDisplay(b) {
    const statusContainer = document.getElementById('dcUploadedFileStatus');
    if (!statusContainer) return;

    if (b.dutySlipUploaded && b.dutySlipFile) {
        statusContainer.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="bi bi-file-earmark-check-fill" style="color:#16a34a; font-size:1.4rem;"></i>
                    <div>
                        <div style="font-weight:600; color:#166534; font-size:0.85rem;">${b.dutySlipFileName || 'Paper Duty Slip Scanned'}</div>
                        <span style="font-size:0.75rem; color:#475569;">Scanned paper slip attached</span>
                    </div>
                </div>
                <div style="display:flex; gap:6px;">
                    <a href="${b.dutySlipFile}" target="_blank" class="btn btn-outline btn-sm"><i class="bi bi-eye"></i> View</a>
                    <a href="${b.dutySlipFile}" download="${b.dutySlipFileName || 'dutyslip.png'}" class="btn btn-outline btn-sm"><i class="bi bi-download"></i> Download</a>
                </div>
            </div>
        `;
    } else {
        statusContainer.innerHTML = `
            <div style="font-size:0.8rem; color:#64748b; font-style:italic;">
                No paper duty slip uploaded yet. Click above or choose file to upload driver's signed slip.
            </div>
        `;
    }
}

// Auto-calculate total KMs and Hours from reading inputs
function autoCalcReadings() {
    const repKm = Number(document.getElementById('dcReportingKm')?.value || 0);
    const relKm = Number(document.getElementById('dcReleasingKm')?.value || 0);
    if (relKm > repKm) {
        document.getElementById('dcTotalKms').value = relKm - repKm;
    }
}

// File upload handler for duty slip
async function handleDutySlipFileSelect(input) {
    if (!input.files || !input.files[0] || !currentDutyCloseBooking) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const fileData = e.target.result;
        const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${currentDutyCloseBooking._id}/upload-duty-slip`, {
            method: 'POST',
            body: JSON.stringify({ fileData, fileName: file.name })
        });

        if (res && res.success) {
            showToast('Duty slip uploaded successfully!');
            currentDutyCloseBooking.dutySlipUploaded = true;
            currentDutyCloseBooking.dutySlipFile = fileData;
            currentDutyCloseBooking.dutySlipFileName = file.name;
            updateDutySlipFileStatusDisplay(currentDutyCloseBooking);
            loadBookings();
        } else {
            showToast('Failed to upload duty slip', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// Submit Close Duty & Auto-Generate Invoice
async function submitCloseDutyAndGenerateInvoice() {
    if (!currentDutyCloseBooking) return;

    const st = computeBookingStatusClient(currentDutyCloseBooking);
    if (!currentDutyCloseBooking.dutyStarted && st !== 'DR_DUTY_START' && !currentDutyCloseBooking.dutyClosed && st !== 'DR_DUTY_CLOSE') {
        const stLabel = (STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st;
        const msg = `Cannot close duty: Booking status must be "DR Duty Started". Current status: ${stLabel}.`;
        if (typeof showToast === 'function') {
            showToast(msg, 'error');
        } else {
            alert(msg);
        }
        return;
    }

    const payload = {
        garageOutKm: Number(document.getElementById('dcGarageOutKm').value || 0),
        garageOutTime: document.getElementById('dcGarageOutTime').value || '',
        reportingKm: Number(document.getElementById('dcReportingKm').value || 0),
        reportingTime: document.getElementById('dcReportingTime').value || '',
        releasingKm: Number(document.getElementById('dcReleasingKm').value || 0),
        releasingTime: document.getElementById('dcReleasingTime').value || '',
        garageInKm: Number(document.getElementById('dcGarageInKm').value || 0),
        garageInTime: document.getElementById('dcGarageInTime').value || '',
        totalKms: Number(document.getElementById('dcTotalKms').value || 0),
        totalHours: Number(document.getElementById('dcTotalHours').value || 0),
        totalDays: Number(document.getElementById('dcTotalDays').value || 1),
        totalNights: Number(document.getElementById('dcTotalNights').value || 0),
        driverAllowance: Number(document.getElementById('dcDriverAllowance').value || 0),
        lateNightCharges: Number(document.getElementById('dcLateNight').value || 0),
        permitCharges: Number(document.getElementById('dcPermit').value || 0),
        fuelSurcharge: Number(document.getElementById('dcFuelSurcharge').value || 0),
        tollCharges: Number(document.getElementById('dcToll').value || 0),
        parkingCharges: Number(document.getElementById('dcParking').value || 0),
        guestSignatureConfirmed: document.getElementById('dcGuestSignConfirmed').checked
    };

    const btn = document.getElementById('btnSubmitCloseDuty');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Generating Tax Invoice...';

    const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${currentDutyCloseBooking._id}/close-duty`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-receipt"></i> Close Duty & Generate Tax Invoice';

    if (res && res.success) {
        showToast(res.message);
        currentDutyCloseBooking = res.data;
        renderGeneratedInvoiceSection(res.invoice, res.data);
        loadBookings();
    } else {
        showToast(res ? res.message : 'Error closing duty', 'error');
    }
}

// Render Tax Invoice Section inside Duty Close Modal
function renderGeneratedInvoiceSection(inv, b) {
    const container = document.getElementById('generatedInvoiceContainer');
    if (!container) return;

    container.style.display = 'block';

    const itemsHtml = (inv.lineItems || []).map((item, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td><strong>${item.description}</strong></td>
            <td style="text-align:center; font-family:monospace;">${item.hsn || '996601'}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right;">₹${Number(item.rate).toFixed(2)}</td>
            <td style="text-align:right; font-weight:700;">₹${Number(item.amount).toFixed(2)}</td>
        </tr>
    `).join('');

    const taxRowsHtml = inv.isSameState ? `
        <tr>
            <td colspan="5" style="text-align:right;">CGST (${inv.cgstRate}%):</td>
            <td style="text-align:right; font-weight:600;">₹${Number(inv.cgstAmount).toFixed(2)}</td>
        </tr>
        <tr>
            <td colspan="5" style="text-align:right;">SGST (${inv.sgstRate}%):</td>
            <td style="text-align:right; font-weight:600;">₹${Number(inv.sgstAmount).toFixed(2)}</td>
        </tr>
    ` : `
        <tr>
            <td colspan="5" style="text-align:right;">IGST (${inv.igstRate}%):</td>
            <td style="text-align:right; font-weight:600;">₹${Number(inv.igstAmount).toFixed(2)}</td>
        </tr>
    `;

    const tollNonTaxableRow = inv.tollParkingNonTaxable > 0 ? `
        <tr>
            <td colspan="5" style="text-align:right;">Toll & Parking (Non-Taxable):</td>
            <td style="text-align:right; font-weight:600;">₹${Number(inv.tollParkingNonTaxable).toFixed(2)}</td>
        </tr>
    ` : '';

    container.innerHTML = `
        <div style="background:#f8fafc; border:1px solid #0f172a; border-radius:8px; padding:20px; margin-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:14px;">
                <div>
                    <h3 style="font-family:var(--font-outfit); font-size:1.25rem; font-weight:800; color:#0f172a; margin:0;">
                        TAX INVOICE #${inv.invoiceNo}
                    </h3>
                    <span style="font-size:0.75rem; color:#16a34a; font-weight:700;">SAME AS DUTY SLIP #${b.dutySlipNo}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="printGeneratedInvoice('${b._id || b.bookingNo}')">
                        <i class="bi bi-printer-fill"></i> Print Invoice + Duty Slip
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="emailGeneratedInvoice('${b._id || b.bookingNo}')">
                        <i class="bi bi-envelope-fill"></i> E-Mail Client
                    </button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.8rem; margin-bottom:14px;">
                <div>
                    <div>Billed To: <strong style="color:#0f172a;">${b.clientName}</strong></div>
                    <div>Passenger: <strong>${b.guestName}</strong></div>
                    <div>Vehicle: <strong>${b.vehicleNumber} (${b.vehicleType})</strong></div>
                </div>
                <div style="text-align:right;">
                    <div>Invoice Date: <strong>${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</strong></div>
                    <div>Due Date: <strong style="color:#dc2626;">${new Date(inv.dueDate).toLocaleDateString('en-IN')}</strong></div>
                    <div>Place of Supply: <strong>${b.location || 'Pune'} (${inv.isSameState ? 'Intra-State' : 'Inter-State'})</strong></div>
                </div>
            </div>

            <table class="tax-invoice-table">
                <thead>
                    <tr>
                        <th style="width:40px; text-align:center;">#</th>
                        <th>Description of Services</th>
                        <th style="width:90px; text-align:center;">SAC</th>
                        <th style="width:60px; text-align:center;">Qty</th>
                        <th style="width:100px; text-align:right;">Rate</th>
                        <th style="width:110px; text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                    <tr>
                        <td colspan="5" style="text-align:right; font-weight:700;">Taxable Amount:</td>
                        <td style="text-align:right; font-weight:700;">₹${Number(inv.taxableAmount).toFixed(2)}</td>
                    </tr>
                    ${taxRowsHtml}
                    ${tollNonTaxableRow}
                    <tr style="background:#f1f5f9; font-size:1rem;">
                        <td colspan="5" style="text-align:right; font-weight:800; color:#0f172a;">Grand Total (Rounded):</td>
                        <td style="text-align:right; font-weight:800; color:#ea580c;">₹${Number(inv.grandTotal).toLocaleString('en-IN')}</td>
                    </tr>
                </tbody>
            </table>

            <div style="font-size:0.78rem; font-style:italic; color:#475569; margin-top:8px;">
                Amount in Words: <strong>${inv.amountInWords}</strong>
            </div>
        </div>
    `;
}

// Print and Email Handlers
async function printGeneratedInvoice(bookingId) {
    const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${bookingId}/invoice`);
    if (!res || !res.success) { showToast('Error loading invoice', 'error'); return; }

    const { invoice, booking, company, brokerProfile } = res.data;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tax Invoice #${invoice.invoiceNo} - Wings Tours & Travels</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 30px; color: #0f172a; font-size: 13px; }
                .inv-box { border: 2px solid #0f172a; padding: 24px; }
                .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; margin: 14px 0; }
                th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
                th { background: #f1f5f9; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body onload="window.print()">
            <div class="inv-box">
                <div class="header">
                    <div>
                        <h2 style="margin:0; font-size:20px;">${brokerProfile.companyLegalName || 'Wings Tours & Travels'}</h2>
                        <div style="font-size:12px; color:#475569;">${brokerProfile.address || ''}</div>
                        <div>GSTIN: <strong style="font-family:monospace;">${brokerProfile.gstin || ''}</strong> | PAN: <strong>${brokerProfile.pan || ''}</strong></div>
                        <div>State: ${brokerProfile.state || ''} (Code: ${brokerProfile.stateCode || '27-MH'})</div>
                    </div>
                    <div style="text-align:right;">
                        <h2 style="margin:0; color:#ea580c;">TAX INVOICE</h2>
                        <div style="font-size:14px; font-weight:bold; margin-top:4px;">Invoice No: #${invoice.invoiceNo}</div>
                        <div>Duty Slip No: #${booking.dutySlipNo}</div>
                        <div>Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:14px;">
                    <div>
                        <div class="bold">Billed To (Client):</div>
                        <div style="font-size:14px; font-weight:bold;">${company.companyName || booking.clientName}</div>
                        <div>${company.billingAddress || ''}</div>
                        <div>GSTIN: <strong style="font-family:monospace;">${company.gstin || ''}</strong> | State: ${company.state || ''} (${company.stateCode || ''})</div>
                    </div>
                    <div style="text-align:right;">
                        <div>Passenger: <strong class="bold">${booking.guestName}</strong></div>
                        <div>Vehicle: <strong>${booking.vehicleNumber} (${booking.vehicleType})</strong></div>
                        <div>Duty Date: ${booking.travelDate ? new Date(booking.travelDate).toLocaleDateString('en-IN') : ''}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:30px;">#</th>
                            <th>Description</th>
                            <th style="width:80px; text-align:center;">SAC</th>
                            <th style="width:50px; text-align:center;">Qty</th>
                            <th style="width:90px;" class="text-right">Rate (₹)</th>
                            <th style="width:100px;" class="text-right">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice.lineItems || []).map((item, i) => `
                            <tr>
                                <td style="text-align:center;">${i + 1}</td>
                                <td>${item.description}</td>
                                <td style="text-align:center;">${item.hsn}</td>
                                <td style="text-align:center;">${item.qty}</td>
                                <td class="text-right">${Number(item.rate).toFixed(2)}</td>
                                <td class="text-right bold">${Number(item.amount).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td colspan="5" class="text-right bold">Taxable Subtotal:</td>
                            <td class="text-right bold">₹${Number(invoice.taxableAmount).toFixed(2)}</td>
                        </tr>
                        ${invoice.isSameState ? `
                            <tr>
                                <td colspan="5" class="text-right">CGST (${invoice.cgstRate}%):</td>
                                <td class="text-right">₹${Number(invoice.cgstAmount).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colspan="5" class="text-right">SGST (${invoice.sgstRate}%):</td>
                                <td class="text-right">₹${Number(invoice.sgstAmount).toFixed(2)}</td>
                            </tr>
                        ` : `
                            <tr>
                                <td colspan="5" class="text-right">IGST (${invoice.igstRate}%):</td>
                                <td class="text-right">₹${Number(invoice.igstAmount).toFixed(2)}</td>
                            </tr>
                        `}
                        ${invoice.tollParkingNonTaxable > 0 ? `
                            <tr>
                                <td colspan="5" class="text-right">Toll & Parking (Non-Taxable):</td>
                                <td class="text-right">₹${Number(invoice.tollParkingNonTaxable).toFixed(2)}</td>
                            </tr>
                        ` : ''}
                        <tr style="background:#f8fafc; font-size:15px;">
                            <td colspan="5" class="text-right bold">Grand Total (Rounded):</td>
                            <td class="text-right bold" style="color:#ea580c;">₹${Number(invoice.grandTotal).toLocaleString('en-IN')}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top:10px;">
                    <div>Amount in Words: <strong>${invoice.amountInWords}</strong></div>
                    <div style="margin-top:14px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px; font-size:12px;">
                        <strong>Bank Details:</strong> ${brokerProfile.bankName} | A/C: ${brokerProfile.accountNumber} | IFSC: ${brokerProfile.ifscCode} | Payable To: ${brokerProfile.accountName}
                    </div>
                </div>

                <div style="margin-top:30px; display:flex; justify-content:space-between; text-align:center;">
                    <div>Guest Signature: __________________</div>
                    <div>For ${brokerProfile.companyLegalName || 'Wings Travels'}<br><br><br>Authorized Signatory</div>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function emailGeneratedInvoice(bookingId) {
    const res = await fetchAuth(`${API_BASE}/aggregator/bookings/${bookingId}/email-invoice`, { method: 'POST' });
    if (res && res.success) {
        showToast(res.message);
    } else {
        showToast('Failed to email invoice', 'error');
    }
}

// ==========================================================================
// REDESIGNED CORPORATE A4 DUTY SLIP & RENTAL AGREEMENT GENERATOR
// ==========================================================================

function buildDutySlipHtml(b, broker = null) {
    if (!b) return '';
    const prof = broker || (typeof brokerProfile !== 'undefined' ? brokerProfile : {}) || {};

    const companyTitle = prof.companyLegalName || "WING'S TRAVELS";
    const address = prof.address || "Office No. 402, Business Bay, Pune-Bangalore Highway";
    const city = prof.city || "Pune";
    const state = prof.state || "Maharashtra";
    const stateCode = prof.stateCode || "27-MH";
    const phone = prof.phone || "+91 98220 12345 / 020-25678900";
    const email = prof.email || prof.billingEmail || "dispatch@wingstravels.com";
    const gstin = prof.gstin || "27AAACR1234M1Z5";
    const jurisdiction = (prof.jurisdictionCity || "PUNE").toUpperCase();

    const dsNo = b.dutySlipNo || b.bookingNo || 'AUTO';
    let travelDateFormatted = 'Date TBD';
    if (b.travelDate) {
        try {
            const d = new Date(b.travelDate);
            travelDateFormatted = isNaN(d.getTime()) ? b.travelDate : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            travelDateFormatted = b.travelDate;
        }
    }

    const location = b.location || city || 'Pune';
    const dutyRefNo = b.dutyRefNo || b.poNumber || b.bookingRef || 'N/A';
    const clientName = b.clientName || (typeof companiesList !== 'undefined' && companiesList.find(c => c._id === b.clientId)?.companyName) || 'Corporate Client';
    const guestName = b.guestName || 'Valued Guest';
    const guestMobile = b.guestPhone || b.bookedByPhone || 'N/A';
    const bookedBy = b.bookedBy || b.createdBy || 'Direct / Admin';
    const reportingAddress = b.reportingAddress || 'As per client instructions';
    const dropAddress = b.dropAddress || b.destination || 'Local Disposal / Destination';
    const vehicleType = b.vehicleType || 'Sedan / SUV';
    const vehicleSend = b.vehicleSend || b.vehicleType || 'Dzire / Etios';
    const vehicleNumber = b.vehicleNumber || 'To Be Allotted';
    const packageType = b.packageType || 'Standard Package';
    const paymentMode = (b.paymentMode || 'CREDIT').toUpperCase();

    let repTimeStr = 'Timing TBD';
    if (!b.noTiming) {
        if (b.reqTime) repTimeStr = b.reqTime;
        else if (b.repHours) repTimeStr = `${String(b.repHours).padStart(2, '0')}:${String(b.repMinutes || '00').padStart(2, '0')} hrs`;
    }
    const destination = b.destination || b.tripType || 'Local Disposal';
    const driverName = b.driverName || 'To Be Allotted';
    const driverMobile = b.driverPhone || 'N/A';

    // Readings & Timings
    const r = b.dutyCloseReadings || {};
    const d = b.dutyCloseDetails || {};
    const garageOutTime = r.garageOutTime || (b.repHours ? `${String(b.repHours).padStart(2, '0')}:${String(b.repMinutes || '00').padStart(2, '0')}` : '');
    const garageOutKm = r.garageOutKm || '';
    const reportingTime = r.reportingTime || '';
    const reportingKm = r.reportingKm || '';
    const releasingTime = r.releasingTime || '';
    const releasingKm = r.releasingKm || '';
    const garageInTime = r.garageInTime || '';
    const garageInKm = r.garageInKm || '';

    const totalHours = r.totalHours || d.totalHours || '';
    const totalKms = r.totalKms || d.totalKm || '';

    // Reimbursements / Expenses
    const toll = d.tollAmount ? `₹${Number(d.tollAmount).toLocaleString('en-IN')}` : '';
    const parking = d.parkingAmount ? `₹${Number(d.parkingAmount).toLocaleString('en-IN')}` : '';
    const borderTax = d.borderTax ? `₹${Number(d.borderTax).toLocaleString('en-IN')}` : '';
    const night = d.nightAllowance ? `₹${Number(d.nightAllowance).toLocaleString('en-IN')}` : '';
    const other = d.otherCharges ? `₹${Number(d.otherCharges).toLocaleString('en-IN')}` : '';

    let totalExpNum = (Number(d.tollAmount) || 0) + (Number(d.parkingAmount) || 0) + (Number(d.borderTax) || 0) + (Number(d.nightAllowance) || 0) + (Number(d.otherCharges) || 0);
    const totalExpenses = totalExpNum > 0 ? `₹${totalExpNum.toLocaleString('en-IN')}` : '';

    return `
        <div class="ds-a4-sheet" id="dutySlipPrintSheet">
            <!-- 1. Document Header (3-Column Top Block) -->
            <div class="ds-header-grid">
                <!-- Left: Logo Badge & Company Title -->
                <div class="ds-header-left">
                    <div class="ds-brand-block">
                        <img src="${prof.logoUrl || 'images/Logo.png'}" alt="Wings Tours & Travels" class="ds-logo-img" onerror="this.onerror=null; this.src='images/Logo.png';">
                        <div>
                            <div class="ds-company-title">${companyTitle}</div>
                            <div class="ds-company-subtitle">Corporate Mobility & Rental Services</div>
                        </div>
                    </div>
                </div>

                <!-- Center: Office Address & Contact -->
                <div class="ds-header-center">
                    <div style="font-weight: 600; color: #0f172a; margin-bottom: 1px;">${address}</div>
                    <div>${city}, ${state} - ${stateCode}</div>
                    <div style="margin-top: 2px;"><strong>24x7 Helpline:</strong> ${phone}</div>
                    <div><strong>Email:</strong> ${email}</div>
                    <div style="margin-top: 1px;"><strong>GSTIN:</strong> ${gstin}</div>
                </div>

                <!-- Right: Metadata Box -->
                <div class="ds-header-right">
                    <div class="ds-meta-box">
                        <div class="ds-meta-row ds-meta-ds-row">
                            <span class="ds-meta-lbl">DUTY SLIP NO:</span>
                            <span class="ds-meta-val ds-meta-ds-no">#${dsNo}</span>
                        </div>
                        <div class="ds-meta-row">
                            <span class="ds-meta-lbl">Date:</span>
                            <span class="ds-meta-val">${travelDateFormatted}</span>
                        </div>
                        <div class="ds-meta-row">
                            <span class="ds-meta-lbl">City / Location:</span>
                            <span class="ds-meta-val">${location}</span>
                        </div>
                        <div class="ds-meta-row">
                            <span class="ds-meta-lbl">Duty Ref / PO:</span>
                            <span class="ds-meta-val">${dutyRefNo}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Full-Width Section Title Bar -->
            <div class="ds-title-banner">
                DUTY SLIP & RENTAL AGREEMENT
            </div>

            <!-- 2. Client & Trip Details Grid -->
            <div class="ds-section-table">
                <!-- Row 1: 4-Column Table -->
                <table class="ds-grid-table">
                    <tbody>
                        <tr>
                            <td class="ds-lbl" style="width: 16%;">Client Company:</td>
                            <td class="ds-val" style="width: 34%; font-weight: 700; color: #0f172a;">${clientName}</td>
                            <td class="ds-lbl" style="width: 16%;">Guest / Renter:</td>
                            <td class="ds-val" style="width: 34%; font-weight: 700; color: #0f172a;">${guestName}</td>
                        </tr>
                        <tr>
                            <td class="ds-lbl">Guest Mobile:</td>
                            <td class="ds-val">${guestMobile}</td>
                            <td class="ds-lbl">Booked By:</td>
                            <td class="ds-val">${bookedBy}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Row 2: 2-Column Split Addresses -->
                <table class="ds-grid-table" style="border-top: none;">
                    <tbody>
                        <tr>
                            <td class="ds-lbl" style="width: 16%;">Reporting Address:</td>
                            <td class="ds-val" style="width: 34%; font-size: 9px; line-height: 1.3;">${reportingAddress}</td>
                            <td class="ds-lbl" style="width: 16%;">Drop / Route:</td>
                            <td class="ds-val" style="width: 34%; font-size: 9px; line-height: 1.3;">${dropAddress}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Row 3: 2-Column Split (Vehicle on Left, Dispatch on Right) -->
                <table class="ds-grid-table" style="border-top: none;">
                    <tbody>
                        <tr>
                            <td class="ds-lbl" style="width: 18%;">Vehicle Category:</td>
                            <td class="ds-val" style="width: 32%;">${vehicleType}</td>
                            <td class="ds-lbl" style="width: 18%;">Reporting Time:</td>
                            <td class="ds-val" style="width: 32%; font-weight: 700;">${repTimeStr}</td>
                        </tr>
                        <tr>
                            <td class="ds-lbl">Vehicle Sent & No:</td>
                            <td class="ds-val" style="font-weight: 700; color: #0f172a;">${vehicleSend} — <span style="font-size: 1.05em; letter-spacing: 0.5px;">${vehicleNumber}</span></td>
                            <td class="ds-lbl">Trip Type / Nature:</td>
                            <td class="ds-val">${destination}</td>
                        </tr>
                        <tr>
                            <td class="ds-lbl">Package / Tariff:</td>
                            <td class="ds-val">${packageType}</td>
                            <td class="ds-lbl">Chauffeur Name:</td>
                            <td class="ds-val" style="font-weight: 700;">${driverName}</td>
                        </tr>
                        <tr>
                            <td class="ds-lbl">Billing / Payment:</td>
                            <td class="ds-val"><span class="ds-badge-payment">${paymentMode}</span></td>
                            <td class="ds-lbl">Chauffeur Mobile:</td>
                            <td class="ds-val">${driverMobile}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 3. Odometer, Timing & Extra Charges Split Grid (60% Left, 40% Right) -->
            <div class="ds-usage-expenses-container">
                <!-- Left: Garage Log & Passenger Usage Record (60%) -->
                <div class="ds-usage-box">
                    <div class="ds-subbanner">GARAGE LOG & PASSENGER USAGE RECORD</div>
                    <table class="ds-reading-table">
                        <thead>
                            <tr>
                                <th style="width: 38%;">Reading Milestone</th>
                                <th style="width: 21%;">Time (24h)</th>
                                <th style="width: 23%;">Odometer (KM)</th>
                                <th style="width: 18%;">Initials</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="ds-milestone">1. Garage Out (Wing's / Vendor)</td>
                                <td class="ds-blank-entry">${garageOutTime}</td>
                                <td class="ds-blank-entry">${garageOutKm}</td>
                                <td class="ds-blank-entry"></td>
                            </tr>
                            <tr class="ds-guest-verify-hdr">
                                <td colspan="4">★ TO BE FILLED & VERIFIED BY GUEST / RENTER:</td>
                            </tr>
                            <tr>
                                <td class="ds-milestone ds-guest-row"><strong>2. Guest Reporting (Opening)</strong></td>
                                <td class="ds-blank-entry ds-guest-row font-bold">${reportingTime}</td>
                                <td class="ds-blank-entry ds-guest-row font-bold">${reportingKm}</td>
                                <td class="ds-blank-entry ds-guest-row"></td>
                            </tr>
                            <tr>
                                <td class="ds-milestone ds-guest-row"><strong>3. Guest Releasing (Closing)</strong></td>
                                <td class="ds-blank-entry ds-guest-row font-bold">${releasingTime}</td>
                                <td class="ds-blank-entry ds-guest-row font-bold">${releasingKm}</td>
                                <td class="ds-blank-entry ds-guest-row"></td>
                            </tr>
                            <tr>
                                <td class="ds-milestone">4. Garage In (Wing's / Vendor)</td>
                                <td class="ds-blank-entry">${garageInTime}</td>
                                <td class="ds-blank-entry">${garageInKm}</td>
                                <td class="ds-blank-entry"></td>
                            </tr>
                            <tr class="ds-total-row">
                                <td class="ds-total-label">TOTAL USAGE RECORD:</td>
                                <td class="ds-total-val"><strong>${totalHours}</strong> Hrs</td>
                                <td class="ds-total-val"><strong>${totalKms}</strong> KMs</td>
                                <td class="ds-total-val">1 Day</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Right: Reimbursements & Incidentals (40%) -->
                <div class="ds-expenses-box">
                    <div class="ds-subbanner">REIMBURSEMENTS & INCIDENTALS (₹)</div>
                    <table class="ds-expenses-table">
                        <tbody>
                            <tr>
                                <td class="ds-exp-lbl">Toll Charges (₹):</td>
                                <td class="ds-exp-val">${toll}</td>
                            </tr>
                            <tr>
                                <td class="ds-exp-lbl">Parking Charges (₹):</td>
                                <td class="ds-exp-val">${parking}</td>
                            </tr>
                            <tr>
                                <td class="ds-exp-lbl">Interstate / Permit Tax (₹):</td>
                                <td class="ds-exp-val">${borderTax}</td>
                            </tr>
                            <tr>
                                <td class="ds-exp-lbl">Night Halt / Allowance (₹):</td>
                                <td class="ds-exp-val">${night}</td>
                            </tr>
                            <tr>
                                <td class="ds-exp-lbl">Other / Sundry Expenses (₹):</td>
                                <td class="ds-exp-val">${other}</td>
                            </tr>
                            <tr class="ds-exp-total-row">
                                <td class="ds-exp-lbl font-bold" style="color: #0f172a;">TOTAL EXTRA CHARGES (₹):</td>
                                <td class="ds-exp-val font-bold" style="color: #0f172a;">${totalExpenses}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="ds-exp-note">
                        * Note: Parking, toll and state permit taxes are extra as per actuals. Attach physical receipts.
                    </div>
                </div>
            </div>

            <!-- 4. Footer: Guest Feedback Rating Matrix, Terms & Signature (55% Left, 45% Right) -->
            <div class="ds-footer-container">
                <!-- Left: Service Feedback Checklist (55%) -->
                <div class="ds-feedback-box">
                    <div class="ds-subbanner">GUEST / RENTER SERVICE FEEDBACK</div>
                    <table class="ds-feedback-table">
                        <thead>
                            <tr>
                                <th style="width: 48%;">Service Performance Parameter</th>
                                <th style="width: 13%;">Exc.</th>
                                <th style="width: 13%;">Good</th>
                                <th style="width: 13%;">Avg.</th>
                                <th style="width: 13%;">Poor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1. Vehicle Cleanliness, AC & Condition</td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                            </tr>
                            <tr>
                                <td>2. Chauffeur Grooming & Punctuality</td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                            </tr>
                            <tr>
                                <td>3. Chauffeur Safe Driving & Route Skill</td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                            </tr>
                            <tr>
                                <td>4. Booking & Coordination Desk</td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                            </tr>
                            <tr>
                                <td>5. Overall Trip & Rental Experience</td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                                <td class="ds-chk-cell"><span class="ds-chkbox"></span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Right: Terms & Authorization / Signatures (45%) -->
                <div class="ds-terms-signature-box">
                    <div class="ds-terms-box">
                        <div class="ds-terms-title">RENTAL TERMS & CONDITIONS</div>
                        <div class="ds-terms-content">
                            1. KMs & hours calculated garage-to-garage unless contract specifies.<br>
                            2. Parking, toll, airport & interstate taxes are extra as per actuals.<br>
                            3. Please verify opening & closing readings before signing.<br>
                            4. Subject to ${jurisdiction} jurisdiction.
                        </div>
                    </div>

                    <div class="ds-signatures-area">
                        <div class="ds-sig-row">
                            <div class="ds-sig-block">
                                <div class="ds-sig-line"></div>
                                <div class="ds-sig-lbl">Guest / Renter Signature</div>
                            </div>
                            <div class="ds-sig-block">
                                <div class="ds-sig-line"></div>
                                <div class="ds-sig-lbl">Date & Releasing Time</div>
                            </div>
                        </div>
                        <div class="ds-driver-sig-strip">
                            <span>Chauffeur / Driver Signature: _______________________</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

let activePrintBookingRecord = null;

// Print Duty Slip modal
function openPrintDutySlipModal(bookingId) {
    let b = null;
    if (bookingId && typeof bookingId === 'object') {
        b = bookingId;
    } else if (bookingId) {
        b = findBookingInList(bookingId);
    }
    if (!b && typeof currentActiveBooking !== 'undefined' && currentActiveBooking) {
        b = currentActiveBooking;
    }
    if (!b) {
        if (typeof showToast === 'function') showToast('No booking selected', 'error');
        return;
    }

    // Merge unsaved live form fields if bookingDetailModal is active
    const isModalOpen = document.getElementById('bookingDetailModal')?.classList.contains('active');
    if (isModalOpen && typeof collectSheetFormData === 'function') {
        const formData = collectSheetFormData();
        b = Object.assign({}, b, formData);
    }

    if (!canPrintDutySlipBooking(b)) {
        const st = computeBookingStatusClient(b);
        const stLabel = (STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st;
        const msg = `Print Duty Slip is only allowed after "Driver Accepted Duty". Current status: ${stLabel}.`;
        if (typeof showToast === 'function') {
            showToast(msg, 'warning');
        } else {
            alert(msg);
        }
        return;
    }

    activePrintBookingRecord = b;
    const broker = (typeof brokerProfile !== 'undefined' ? brokerProfile : null) || {};
    const html = buildDutySlipHtml(b, broker);

    const printArea = document.getElementById('dutySlipPrintArea');
    if (printArea) {
        printArea.innerHTML = html;
    }

    const noBadge = document.getElementById('dsPreviewNoBadge');
    if (noBadge) {
        noBadge.textContent = `#${b.dutySlipNo || b.bookingNo || 'AUTO'}`;
    }

    if (typeof openModal === 'function') {
        openModal('dutySlipPreviewModal');
    } else {
        const m = document.getElementById('dutySlipPreviewModal');
        if (m) m.classList.add('active');
    }
}

function printDutySlipNow() {
    let b = activePrintBookingRecord;
    if (b && !canPrintDutySlipBooking(b)) {
        const st = computeBookingStatusClient(b);
        const stLabel = (STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st;
        if (typeof showToast === 'function') showToast(`Print Duty Slip is only allowed after "Driver Accepted Duty". Current status: ${stLabel}.`, 'warning');
        return;
    }
    if (!b) {
        const printArea = document.getElementById('dutySlipPrintArea');
        if (!printArea || !printArea.innerHTML.trim()) {
            if (typeof showToast === 'function') showToast('No duty slip loaded to print.', 'error');
            return;
        }
    }

    const broker = (typeof brokerProfile !== 'undefined' ? brokerProfile : null) || {};
    const slipHtml = b ? buildDutySlipHtml(b, broker) : document.getElementById('dutySlipPrintArea').innerHTML;
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    // Create or reuse hidden iframe to print ONLY the duty slip
    let printIframe = document.getElementById('dutySlipPrintIframe');
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'dutySlipPrintIframe';
        printIframe.name = 'dutySlipPrintIframe';
        printIframe.style.position = 'fixed';
        printIframe.style.top = '-9999px';
        printIframe.style.left = '-9999px';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = 'none';
        document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentDocument || printIframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <base href="${baseUrl}">
            <meta charset="UTF-8">
            <title>Duty Slip #${(b && (b.dutySlipNo || b.bookingNo)) || 'PRINT'} - WING'S TRAVELS</title>
            <link rel="stylesheet" href="aggregator-bookings.css">
            <style>
                @page {
                    size: A4 portrait;
                    margin: 6mm 8mm;
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box;
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    width: 100% !important;
                    display: block !important;
                }
                .ds-a4-sheet {
                    margin: 0 auto !important;
                    border: 1px solid #000 !important;
                    box-shadow: none !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
            </style>
        </head>
        <body>
            ${slipHtml}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        try {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        } catch (e) {
            console.error('Iframe print error, falling back to window.print', e);
            window.print();
        }
    }, 300);
}

function openDutySlipInNewWindow() {
    if (!activePrintBookingRecord) return;
    const b = activePrintBookingRecord;
    if (!canPrintDutySlipBooking(b)) {
        const st = computeBookingStatusClient(b);
        const stLabel = (STATUS_CONFIG[st] && STATUS_CONFIG[st].label) || st;
        if (typeof showToast === 'function') showToast(`Open Duty Slip is only allowed after "Driver Accepted Duty". Current status: ${stLabel}.`, 'warning');
        return;
    }
    const broker = (typeof brokerProfile !== 'undefined' ? brokerProfile : null) || {};
    const slipHtml = buildDutySlipHtml(b, broker);
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        if (typeof showToast === 'function') showToast('Popup blocked. Please allow popups for this site.', 'error');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <base href="${baseUrl}">
            <meta charset="UTF-8">
            <title>Duty Slip #${b.dutySlipNo || b.bookingNo || 'PRINT'} - WING'S TRAVELS</title>
            <link rel="stylesheet" href="aggregator-bookings.css">
            <style>
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    display: flex;
                    justify-content: center;
                }
                .ds-a4-sheet {
                    border: 1px solid #000;
                    box-shadow: none;
                    margin: 0;
                }
                @page {
                    size: A4 portrait;
                    margin: 6mm 8mm;
                }
            </style>
        </head>
        <body onload="window.print()">
            ${slipHtml}
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Print Ply Card (Placard) modal
function openPrintPlyCardModal(bookingId) {
    const b = bookingId ? findBookingInList(bookingId) : currentActiveBooking;
    if (!b) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Placard - ${b.guestName}</title>
            <style>
                body { font-family: 'Arial', sans-serif; display: flex; align-items: center; justify-content: center; height: 95vh; margin: 0; background: #fff; }
                .placard { border: 6px solid #0f172a; padding: 40px; text-align: center; width: 85%; border-radius: 12px; }
                .guest { font-size: 38px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 24px 0; }
                .company { font-size: 24px; font-weight: 700; color: #ea580c; text-transform: uppercase; }
                .meta { font-size: 16px; color: #475569; margin-top: 24px; }
            </style>
        </head>
        <body onload="window.print()">
            <div class="placard">
                <div class="company">${b.clientName || 'WINGS TRAVELS'}</div>
                <div style="font-size:16px; color:#64748b; margin-top:6px;">WELCOME TO PUNE</div>
                <div class="guest">${b.guestName || 'GUEST NAME'}</div>
                <div class="meta">
                    Vehicle: <strong>${b.vehicleNumber || ''} (${b.vehicleType || ''})</strong><br>
                    Driver: <strong>${b.driverName || ''} (${b.driverPhone || ''})</strong>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Bind live listeners in sheet form for auto-completeness feedback
document.addEventListener('DOMContentLoaded', () => {
    const sheetInputs = [
        'sheetTravelDate', 'sheetRepHours', 'sheetRepMinutes',
        'sheetClientSelect', 'sheetVehicleType', 'sheetPackageType', 'sheetGuestName',
        'sheetVendorSelect', 'sheetVendorPackage', 'sheetVehicleNumber', 'sheetDriverName', 'sheetDrAcptToggle'
    ];

    sheetInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSheetLiveCompleteness);
            el.addEventListener('change', updateSheetLiveCompleteness);
        }
    });

    // Auto calculate readings in duty close
    ['dcReportingKm', 'dcReleasingKm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', autoCalcReadings);
    });
});

// =========================================================================
// 5. TEST & DEMO FALLBACK DATA STORES
// =========================================================================
function getFallbackCompanies() {
    return [
        {
            _id: 'mock_comp1',
            companyName: 'Infosys BPM Pune',
            billingAddress: 'Plot No. 1, Hinjewadi Phase 2, Rajiv Gandhi Infotech Park, Pune, Maharashtra 411057',
            state: 'Maharashtra',
            stateCode: '27-MH',
            gstin: '27AAACI1234F1Z8',
            creditPeriodDays: 30,
            gstRate: 5.0,
            status: true,
            rateCards: [
                { _id: 'rc1', vehicleCategory: 'Sedan A/C', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 2200, extraKmRate: 18, extraHourRate: 200, driverDayAllowance: 300, nightLateAllowance: 250 },
                { _id: 'rc2', vehicleCategory: 'SUV / Innova', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 3400, extraKmRate: 24, extraHourRate: 300, driverDayAllowance: 350, nightLateAllowance: 300 },
                { _id: 'rc3', vehicleCategory: 'Sedan A/C', packageName: 'Pune Airport Drop', baseHours: 4, baseKms: 40, basePackageRate: 1400, extraKmRate: 18, extraHourRate: 200, driverDayAllowance: 0, nightLateAllowance: 200 }
            ]
        },
        {
            _id: 'mock_comp2',
            companyName: 'Tata Consultancy Services (TCS)',
            billingAddress: 'Sahyadri Park, Hinjewadi Phase 3, Pune, Maharashtra 411057',
            state: 'Maharashtra',
            stateCode: '27-MH',
            gstin: '27AAACT9876Q1Z2',
            creditPeriodDays: 45,
            gstRate: 5.0,
            status: true,
            rateCards: [
                { _id: 'rc4', vehicleCategory: 'Hatchback', packageName: '4 Hrs / 40 Km', baseHours: 4, baseKms: 40, basePackageRate: 1200, extraKmRate: 14, extraHourRate: 150, driverDayAllowance: 0, nightLateAllowance: 150 },
                { _id: 'rc5', vehicleCategory: 'Sedan A/C', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 2150, extraKmRate: 17, extraHourRate: 190, driverDayAllowance: 250, nightLateAllowance: 200 },
                { _id: 'rc6', vehicleCategory: 'SUV / Innova', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 3300, extraKmRate: 23, extraHourRate: 280, driverDayAllowance: 300, nightLateAllowance: 250 }
            ]
        },
        {
            _id: 'mock_comp3',
            companyName: 'Tech Mahindra Ltd.',
            billingAddress: 'Phase 3, Hinjewadi Rajiv Gandhi Infotech Park, Pune, Maharashtra 411057',
            state: 'Maharashtra',
            stateCode: '27-MH',
            gstin: '27AAACT2345N1ZK',
            creditPeriodDays: 30,
            gstRate: 5.0,
            status: true,
            rateCards: [
                { _id: 'rc7', vehicleCategory: 'Sedan A/C', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 2250, extraKmRate: 18, extraHourRate: 210, driverDayAllowance: 300, nightLateAllowance: 250 },
                { _id: 'rc8', vehicleCategory: 'SUV / Innova', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 3500, extraKmRate: 25, extraHourRate: 300, driverDayAllowance: 350, nightLateAllowance: 300 },
                { _id: 'rc9', vehicleCategory: 'Tempo Traveller', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 5500, extraKmRate: 32, extraHourRate: 450, driverDayAllowance: 500, nightLateAllowance: 400 }
            ]
        },
        {
            _id: 'mock_comp4',
            companyName: 'Wipro Technologies (Karnataka Corporate)',
            billingAddress: 'Doddakannelli, Sarjapur Road, Bangalore, Karnataka 560035',
            state: 'Karnataka',
            stateCode: '29-KA',
            gstin: '29AAACW1234A1Z9',
            creditPeriodDays: 60,
            gstRate: 5.0,
            status: true,
            rateCards: [
                { _id: 'rc10', vehicleCategory: 'Sedan A/C', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 2300, extraKmRate: 19, extraHourRate: 220, driverDayAllowance: 300, nightLateAllowance: 250 }
            ]
        },
        {
            _id: 'mock_comp5',
            companyName: 'Cognizant Technology Solutions',
            billingAddress: 'Quadron Business Park, Hinjewadi Phase 2, Pune, Maharashtra 411057',
            state: 'Maharashtra',
            stateCode: '27-MH',
            gstin: '27AAACC4321K1Z4',
            creditPeriodDays: 30,
            gstRate: 5.0,
            status: true,
            rateCards: [
                { _id: 'rc11', vehicleCategory: 'Sedan A/C', packageName: '8 Hrs / 80 Km', baseHours: 8, baseKms: 80, basePackageRate: 2200, extraKmRate: 18, extraHourRate: 200, driverDayAllowance: 300, nightLateAllowance: 250 }
            ]
        }
    ];
}

function getFallbackVendors() {
    const today = new Date();
    const futureDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    return [
        {
            _id: 'mock_v1',
            vendorName: 'Om Sai Tour & Travels',
            contactPerson: 'Santosh Jadhav',
            phone: '+91 98901 23456',
            status: true,
            vehicles: [
                { _id: 'veh1', registrationNumber: 'MH12 QK7890', vehicleCategory: 'Sedan A/C', vehicleModel: 'Maruti Swift Dzire White', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true },
                { _id: 'veh2', registrationNumber: 'MH12 AB1234', vehicleCategory: 'SUV / Innova', vehicleModel: 'Toyota Innova Crysta Grey', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true },
                { _id: 'veh3', registrationNumber: 'MH14 TC5566', vehicleCategory: 'Tempo Traveller', vehicleModel: 'Force Traveller 17-Seater', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true }
            ],
            drivers: [
                { _id: 'drv1', driverName: 'Ramesh Pawar', phone: '+91 97654 32100', licenseExpiryDate: futureDate, status: true },
                { _id: 'drv2', driverName: 'Vikram Gaikwad', phone: '+91 98223 99887', licenseExpiryDate: futureDate, status: true }
            ]
        },
        {
            _id: 'mock_v2',
            vendorName: 'Balaji Fleet Aggregators (Ad-hoc Partner)',
            contactPerson: 'Mahesh Shinde',
            phone: '+91 94220 87654',
            status: true,
            vehicles: [],
            drivers: []
        },
        {
            _id: 'mock_v3',
            vendorName: 'Sai Shraddha Cabs & Logistics',
            contactPerson: 'Anand Patil',
            phone: '+91 98505 67890',
            status: true,
            vehicles: [
                { _id: 'veh4', registrationNumber: 'MH12 RN9900', vehicleCategory: 'Sedan A/C', vehicleModel: 'Hyundai Aura White', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true },
                { _id: 'veh5', registrationNumber: 'MH12 EF5678', vehicleCategory: 'SUV / Innova', vehicleModel: 'Maruti Suzuki Ertiga Silver', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true }
            ],
            drivers: [
                { _id: 'drv3', driverName: 'Sachin Kadam', phone: '+91 98600 77112', licenseExpiryDate: futureDate, status: true },
                { _id: 'drv4', driverName: 'Ganesh Shinde', phone: '+91 99700 88223', licenseExpiryDate: futureDate, status: true }
            ]
        },
        {
            _id: 'mock_v4',
            vendorName: 'Shree Ganesh Travels Pune',
            contactPerson: 'Sunil Bhosale',
            phone: '+91 97665 43210',
            status: true,
            vehicles: [
                { _id: 'veh6', registrationNumber: 'MH12 GH4321', vehicleCategory: 'Sedan A/C', vehicleModel: 'Maruti Dzire Tour S', insuranceExpiryDate: futureDate, fitnessExpiryDate: futureDate, status: true }
            ],
            drivers: [
                { _id: 'drv5', driverName: 'Prakash Jagtap', phone: '+91 98810 55443', licenseExpiryDate: futureDate, status: true }
            ]
        }
    ];
}

function getFallbackBookings() {
    return [
        {
            _id: 'mock_bk_73420',
            bookingNo: '73420',
            dutySlipNo: '73420',
            status: 'DR_DUTY_CLOSE',
            travelDate: '2026-11-22',
            reqTime: '08:00',
            repHours: '08',
            repMinutes: '00',
            clientName: 'Tata Consultancy Services (TCS)',
            guestName: 'Dr. Scott Chen',
            guestPhone: '+91 74475 59053',
            vehicleType: 'Sedan A/C',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH12 QK7890',
            driverName: 'Ramesh Pawar',
            driverPhone: '+91 97654 32100',
            driverAccepted: true,
            dutyStarted: true,
            dutyClosed: true,
            location: 'Pune',
            isInvoiced: true,
            dutySlipUploaded: true
        },
        {
            _id: 'mock_bk_73421',
            bookingNo: '73421',
            dutySlipNo: '73421',
            status: 'DR_DUTY_START',
            travelDate: '2026-11-22',
            reqTime: '09:00',
            repHours: '09',
            repMinutes: '00',
            clientName: 'Infosys BPM Pune',
            guestName: 'Mr. Yun',
            guestPhone: '+91 98223 99887',
            vehicleType: 'SUV / Innova',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH12 AB1234',
            driverName: 'Vikram Gaikwad',
            driverPhone: '+91 98223 99887',
            driverAccepted: true,
            dutyStarted: true,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73422',
            bookingNo: '73422',
            dutySlipNo: '73422',
            status: 'DR_DUTY_ACCPT',
            travelDate: '2026-11-22',
            reqTime: '14:30',
            repHours: '14',
            repMinutes: '30',
            clientName: 'Tech Mahindra Ltd.',
            guestName: 'Ms. Ananya Roy',
            guestPhone: '+91 98900 11223',
            vehicleType: 'Sedan A/C',
            packageType: 'Pune Airport Drop',
            vehicleNumber: 'MH12 RN9900',
            driverName: 'Sachin Kadam',
            driverPhone: '+91 98600 77112',
            driverAccepted: true,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73423',
            bookingNo: '73423',
            dutySlipNo: '73423',
            status: 'STATUS_YES',
            travelDate: '2026-11-22',
            reqTime: '16:00',
            repHours: '16',
            repMinutes: '00',
            clientName: 'Tata Consultancy Services (TCS)',
            guestName: 'Mr. Rajesh Sharma',
            guestPhone: '+91 98221 66554',
            vehicleType: 'Sedan A/C',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH12 AB1234',
            driverName: 'Vikram Gaikwad',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73424',
            bookingNo: '73424',
            dutySlipNo: '73424',
            status: 'STATUS_NO',
            travelDate: '2026-11-23',
            reqTime: '08:30',
            repHours: '08',
            repMinutes: '30',
            clientName: 'Infosys BPM Pune',
            guestName: 'Mr. David Miller',
            guestPhone: '+91 98112 33445',
            vehicleType: 'Sedan A/C',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: '',
            driverName: '',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73425',
            bookingNo: '73425',
            dutySlipNo: '73425',
            status: 'NO_TIMING',
            travelDate: '2026-11-22',
            reqTime: '',
            noTiming: true,
            timingNotes: 'Flight landing time will be confirmed by evening',
            clientName: 'Tata Consultancy Services (TCS)',
            guestName: 'Mr. Vikram Patel',
            guestPhone: '+91 98229 88776',
            vehicleType: 'SUV / Innova',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: '',
            driverName: '',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73426',
            bookingNo: '73426',
            dutySlipNo: '73426',
            status: 'STATUS_CANCEL',
            travelDate: '2026-11-22',
            reqTime: '11:00',
            repHours: '11',
            repMinutes: '00',
            cancelReason: 'Client flight SG-104 cancelled by SpiceJet due to severe weather at Mumbai airport',
            clientName: 'Infosys BPM Pune',
            guestName: 'Mr. Amit Verma',
            guestPhone: '+91 99220 55443',
            vehicleType: 'Sedan A/C',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH12 QK7890',
            driverName: 'Ramesh Pawar',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73428',
            bookingNo: '73428',
            dutySlipNo: '73428',
            status: 'NO_TIMING',
            travelDate: '2026-11-23',
            reqTime: '',
            noTiming: true,
            timingNotes: 'Board meeting schedule will decide pickup hour',
            clientName: 'Tech Mahindra Ltd.',
            guestName: 'Ms. Rashmi Joshi',
            guestPhone: '+91 98234 55677',
            vehicleType: 'Sedan A/C',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: '',
            driverName: '',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73429',
            bookingNo: '73429',
            dutySlipNo: '73429',
            status: 'DR_DUTY_ACCPT',
            travelDate: '2026-11-23',
            reqTime: '07:30',
            repHours: '07',
            repMinutes: '30',
            clientName: 'Wipro Technologies (Karnataka Corporate)',
            guestName: 'Mr. Rohan Mehta',
            guestPhone: '+91 98199 44332',
            vehicleType: 'SUV / Innova',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH12 EF5678',
            driverName: 'Ganesh Shinde',
            driverAccepted: true,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        },
        {
            _id: 'mock_bk_73430',
            bookingNo: '73430',
            dutySlipNo: '73430',
            status: 'STATUS_CANCEL',
            travelDate: '2026-11-24',
            reqTime: '08:00',
            repHours: '08',
            repMinutes: '00',
            cancelReason: 'Client conference postponed by 2 weeks; cab booking cancelled with prior notice',
            clientName: 'Tech Mahindra Ltd.',
            guestName: 'Dr. Neha Kulkarni',
            guestPhone: '+91 99220 11998',
            vehicleType: 'Tempo Traveller',
            packageType: '8 Hrs / 80 Km',
            vehicleNumber: 'MH14 TC5566',
            driverName: 'Vikram Gaikwad',
            driverAccepted: false,
            dutyStarted: false,
            dutyClosed: false,
            location: 'Pune'
        }
    ];
}

if (typeof window !== 'undefined') {
    window.buildDutySlipHtml = buildDutySlipHtml;
    window.openPrintDutySlipModal = openPrintDutySlipModal;
    window.printDutySlipNow = printDutySlipNow;
    window.openDutySlipInNewWindow = openDutySlipInNewWindow;
    window.canPrintDutySlipBooking = canPrintDutySlipBooking;
    window.canCloseDutyBooking = canCloseDutyBooking;
    window.openDutyCloseModal = openDutyCloseModal;
    window.submitCloseDutyAndGenerateInvoice = submitCloseDutyAndGenerateInvoice;
    window.computeBookingStatusClient = computeBookingStatusClient;
    window.startDutyManually = startDutyManually;
    window.startDutyFromSheet = startDutyFromSheet;
}

