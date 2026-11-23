/* ==========================================================================
   STAGE-WISE COMMUNICATION ENGINE (EMAIL & WHATSAPP)
   Wings Tours & Travels - Dispatch & Fleet Aggregator
   ========================================================================== */

const DEFAULT_MESSAGE_TEMPLATES = {
    BOOKING_CREATED: {
        CLIENT: {
            whatsapp: `*Booking Acknowledgment - Wings Tours & Travels*
Dear {{guest_name}},

Your cab booking has been received with thanks.
• *Duty Slip / Booking No:* #{{ds_no}}
• *Company:* {{client_name}}
• *Travel Date:* {{travel_date}}
• *Reporting Time:* {{rep_time}}
• *Package / Vehicle:* {{package}} ({{vehicle_type}})
• *Reporting Address:* {{reporting_addr}}
• *Drop / Destination:* {{drop_addr}}

Vehicle and driver details will be allotted and shared with you shortly prior to the trip.

For any queries, please reach us at {{broker_phone}}.
Have a pleasant journey!`,
            emailSubject: `Booking Acknowledged: #{{ds_no}} - {{guest_name}} | {{travel_date}}`,
            emailBody: `Dear {{guest_name}},

Thank you for choosing Wings Tours & Travels. We have received your cab booking with the following details:

Booking / Duty Slip No: #{{ds_no}}
Client / Corporate: {{client_name}}
Travel Date: {{travel_date}}
Reporting Time: {{rep_time}}
Package: {{package}}
Vehicle Category: {{vehicle_type}}
Reporting Address: {{reporting_addr}}
Drop Address: {{drop_addr}}

Status: Allotment in progress. Driver and vehicle details will be shared once assigned.

Best regards,
Wings Tours & Travels
Helpline: {{broker_phone}} | Email: {{broker_email}}`
        },
        DRIVER: {
            whatsapp: `*Duty Notification - Wings Tours & Travels*
Namaste Driver Partner,

A new duty is being planned:
• *Duty Slip No:* #{{ds_no}}
• *Travel Date:* {{travel_date}}
• *Reporting Time:* {{rep_time}}
• *Pickup:* {{reporting_addr}}
• *Drop:* {{drop_addr}}
• *Package:* {{package}}

Official allotment will follow shortly. Please stay available.`,
            emailSubject: `Tentative Duty: D.S. #{{ds_no}} - {{travel_date}}`,
            emailBody: `Namaste Driver / Vendor,

A duty is being scheduled for Travel Date: {{travel_date}} at {{rep_time}}.
Pickup: {{reporting_addr}}
Drop: {{drop_addr}}

Details will be confirmed upon final dispatch.
Wings Tours & Travels | {{broker_phone}}`
        }
    },
    DRIVER_ALLOTTED: {
        CLIENT: {
            whatsapp: `*Cab & Driver Allotted - Wings Tours & Travels*
Dear {{guest_name}},

Your vehicle and driver have been confirmed for Duty Slip #{{ds_no}}.
• *Travel Date & Time:* {{travel_date}} at {{rep_time}}
• *Vehicle:* {{vehicle_type}} - *{{vehicle_no}}*
• *Driver Name:* {{driver_name}}
• *Driver Contact:* {{driver_phone}}
• *Pickup Address:* {{reporting_addr}}
• *Drop Address:* {{drop_addr}}

The driver will arrive at least 15 minutes before reporting time. Please contact the driver or our 24x7 dispatch desk at {{broker_phone}} if needed.`,
            emailSubject: `Vehicle & Driver Allotment: Duty Slip #{{ds_no}} - {{guest_name}} ({{vehicle_no}})`,
            emailBody: `Dear {{guest_name}},

Your vehicle and driver allotment for Duty Slip #{{ds_no}} has been confirmed.

Trip Schedule:
• Travel Date: {{travel_date}}
• Reporting Time: {{rep_time}}
• Reporting Address: {{reporting_addr}}
• Drop Address: {{drop_addr}}
• Package: {{package}}

Vehicle & Driver Details:
• Assigned Vehicle: {{vehicle_type}} ({{vehicle_no}})
• Driver Name: {{driver_name}}
• Driver Mobile: {{driver_phone}}

For any assistance during the journey, please call our 24x7 dispatch desk at {{broker_phone}}.

Warm regards,
Wings Tours & Travels`
        },
        DRIVER: {
            whatsapp: `*Wings Travels Duty Dispatch - Duty Slip #{{ds_no}}*
Namaste {{driver_name}},

You have been assigned a new duty:
• *Duty Slip No:* #{{ds_no}}
• *Company:* {{client_name}}
• *Passenger Name:* {{guest_name}}
• *Passenger Mobile:* {{guest_phone}}
• *Reporting Date & Time:* {{travel_date}} @ {{rep_time}}
• *Pickup Location:* {{reporting_addr}}
• *Drop Location:* {{drop_addr}}
• *Vehicle Number:* {{vehicle_no}}
• *Package:* {{package}}

*Instructions:*
1. Report 15 minutes before reporting time in neat uniform.
2. Ensure car is clean and AC is working.
3. Open digital duty slip upon passenger boarding.
For any issue, contact dispatch desk: {{broker_phone}}.`,
            emailSubject: `Duty Dispatch Allotment: D.S. #{{ds_no}} - {{vehicle_no}} - {{guest_name}}`,
            emailBody: `Namaste {{driver_name}},

Please find duty allotment details below:

Duty Slip No: #{{ds_no}}
Client: {{client_name}}
Passenger: {{guest_name}} ({{guest_phone}})
Reporting Date: {{travel_date}}
Reporting Time: {{rep_time}}
Pickup Address: {{reporting_addr}}
Drop Address: {{drop_addr}}
Vehicle Number: {{vehicle_no}}
Package: {{package}}

Instructions:
- Report in proper uniform with sanitized vehicle.
- Maintain speed regulations and verify passenger identity.

Dispatch Control Room: {{broker_phone}}
Wings Tours & Travels`
        }
    },
    DUTY_STARTED: {
        CLIENT: {
            whatsapp: `*Trip Started - Wings Tours & Travels*
Dear {{guest_name}},

Your trip for Duty Slip #{{ds_no}} has commenced.
• *Vehicle:* {{vehicle_no}}
• *Driver:* {{driver_name}} ({{driver_phone}})
• *Reporting Time:* {{rep_time}}

Wishing you a comfortable, safe, and pleasant trip!
Dispatch Support: {{broker_phone}}`,
            emailSubject: `Trip Started: Duty Slip #{{ds_no}} - {{guest_name}} ({{vehicle_no}})`,
            emailBody: `Dear {{guest_name}},

We are pleased to inform you that your journey for Duty Slip #{{ds_no}} has begun.

Driver: {{driver_name}} ({{driver_phone}})
Vehicle: {{vehicle_no}}
Travel Date: {{travel_date}}

Our 24x7 support team is available at {{broker_phone}} if you require any assistance.

Warm regards,
Wings Tours & Travels`
        },
        DRIVER: {
            whatsapp: `*Trip Underway - Wings Tours & Travels*
Namaste {{driver_name}},

Duty Slip #{{ds_no}} for passenger {{guest_name}} is now marked as started.
Drive safely and ensure full passenger comfort.
Emergency / Control Desk: {{broker_phone}}`,
            emailSubject: `Duty Started Acknowledgment: D.S. #{{ds_no}}`,
            emailBody: `Namaste {{driver_name}},

Duty Slip #{{ds_no}} has been commenced in the dispatch system. Drive safely.

Wings Tours & Travels`
        }
    },
    DUTY_CLOSED: {
        CLIENT: {
            whatsapp: `*Duty Completed & Invoice Summary - Wings Tours & Travels*
Dear {{guest_name}},

Your duty for Duty Slip #{{ds_no}} has been successfully completed.
• *Duty Slip / Invoice No:* #{{ds_no}}
• *Travel Date:* {{travel_date}}
• *Total Billed:* {{total_kms}} KMs | {{total_hours}} Hrs
• *Grand Total:* ₹{{invoice_total}}
• *Payment Due:* Within {{credit_days}} days

Thank you for travelling with Wings Tours & Travels. We look forward to serving you again!
Support: {{broker_phone}} | {{broker_email}}`,
            emailSubject: `Trip Completed & Invoice Summary: Duty Slip #{{ds_no}} - ₹{{invoice_total}}`,
            emailBody: `Dear {{guest_name}} / Accounts Team,

Thank you for booking with Wings Tours & Travels. The duty for Duty Slip #{{ds_no}} has completed and the billing details are summarized below:

Invoice / Duty Slip No: #{{ds_no}}
Client Company: {{client_name}}
Guest Name: {{guest_name}}
Date of Journey: {{travel_date}}
Vehicle Used: {{vehicle_type}} ({{vehicle_no}})
Billed Distance & Time: {{total_kms}} KMs / {{total_hours}} Hours
Total Amount Payable: ₹{{invoice_total}}
Payment Terms: Credit period {{credit_days}} days.

Please find the official tax invoice attached or generated in your portal.

Best regards,
Billing & Accounts Team
Wings Tours & Travels | {{broker_phone}}`
        },
        DRIVER: {
            whatsapp: `*Duty Slip Closed - Wings Tours & Travels*
Namaste {{driver_name}},

Duty Slip #{{ds_no}} has been successfully closed.
• *Passenger:* {{guest_name}}
• *Date:* {{travel_date}}
• *Billed KMs & Time:* {{total_kms}} KMs / {{total_hours}} Hrs
• *Vehicle:* {{vehicle_no}}

Thank you for your service and safe driving!`,
            emailSubject: `Duty Slip Settlement Recorded: D.S. #{{ds_no}} - {{driver_name}}`,
            emailBody: `Namaste {{driver_name}} / Vendor {{vendor_name}},

Duty Slip #{{ds_no}} for vehicle {{vehicle_no}} has been marked as closed in our system.

Total Logged KMs: {{total_kms}} KMs
Total Logged Hours: {{total_hours}} Hours
Duty Status: CLOSED

Regards,
Operations Team, Wings Tours & Travels`
        }
    },
    CANCELLED: {
        CLIENT: {
            whatsapp: `*Booking Cancellation Notice - Wings Tours & Travels*
Dear {{guest_name}},

This is to confirm that your cab booking for Duty Slip #{{ds_no}} scheduled for {{travel_date}} has been *CANCELLED*.
• *Reason:* {{cancel_reason}}

If you did not request this cancellation or need to reschedule, please contact dispatch immediately at {{broker_phone}}.`,
            emailSubject: `Cancellation Notice: Duty Slip #{{ds_no}} - {{guest_name}} | {{travel_date}}`,
            emailBody: `Dear {{guest_name}},

Please be advised that your booking for Duty Slip #{{ds_no}} has been cancelled.

Details:
• Duty Slip / Booking No: #{{ds_no}}
• Scheduled Date: {{travel_date}}
• Client: {{client_name}}
• Reason for Cancellation: {{cancel_reason}}

If this was done in error or you wish to re-book, please contact our dispatch team at {{broker_phone}} or reply to this email.

Warm regards,
Wings Tours & Travels`
        },
        DRIVER: {
            whatsapp: `*Duty Cancelled Notice - Wings Tours & Travels*
Namaste {{driver_name}},

Duty Slip #{{ds_no}} for passenger {{guest_name}} on {{travel_date}} has been *CANCELLED*.
• *Reason:* {{cancel_reason}}
• *Vehicle:* {{vehicle_no}}

Please DO NOT report for this duty. For duty reassignment, contact dispatch: {{broker_phone}}.`,
            emailSubject: `Duty Cancelled: D.S. #{{ds_no}} - {{vehicle_no}} - Do Not Report`,
            emailBody: `Namaste {{driver_name}},

Please note that Duty Slip #{{ds_no}} scheduled for {{travel_date}} has been CANCELLED.
Reason: {{cancel_reason}}

You are relieved from this duty. Please coordinate with dispatch control room at {{broker_phone}} for your next assignment.

Wings Tours & Travels`
        }
    }
};

// Retrieve customized or default templates
function getEffectiveTemplates() {
    try {
        const stored = localStorage.getItem('wings_msg_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                // Deep merge with defaults so newly added keys are always present
                const merged = JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES));
                for (const stage in parsed) {
                    if (merged[stage]) {
                        for (const recip in parsed[stage]) {
                            merged[stage][recip] = Object.assign({}, merged[stage][recip], parsed[stage][recip]);
                        }
                    } else {
                        merged[stage] = parsed[stage];
                    }
                }
                return merged;
            }
        }
    } catch (e) {
        console.warn('Error reading wings_msg_templates from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES));
}

// Clean and format WhatsApp phone numbers (Indian mobile standard)
function formatWhatsAppPhone(phoneStr) {
    if (!phoneStr) return { raw: '', formatted: '', isValid: false, display: 'No phone number' };
    let clean = String(phoneStr).replace(/\D/g, '');
    clean = clean.replace(/^0+/, ''); // strip leading 0s
    if (clean.length === 10) {
        clean = '91' + clean;
    }
    const isValid = clean.length >= 10 && clean.length <= 15;
    return {
        raw: phoneStr,
        formatted: clean,
        isValid,
        display: isValid ? `+${clean}` : (phoneStr || 'Invalid number')
    };
}

// Helper to extract booking values safely
function getBookingFieldValue(b, key) {
    if (!b) return '';
    switch (key) {
        case 'ds_no':
        case 'booking_no':
            return b.dutySlipNo || b.bookingNo || 'AUTO';
        case 'client_name':
            if (b.clientName) return b.clientName;
            if (b.clientId && typeof companiesList !== 'undefined' && Array.isArray(companiesList)) {
                const comp = companiesList.find(c => c._id === b.clientId);
                if (comp) return comp.companyName;
            }
            return 'Corporate Client';
        case 'guest_name':
            return b.guestName || 'Valued Guest';
        case 'guest_phone':
            return b.guestPhone || b.bookedByPhone || '';
        case 'travel_date':
            if (!b.travelDate) return 'Date TBD';
            try {
                const d = new Date(b.travelDate);
                return isNaN(d.getTime()) ? b.travelDate : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
                return b.travelDate;
            }
        case 'rep_time':
            if (b.noTiming) return 'Timing TBD';
            if (b.reqTime) return b.reqTime;
            if (b.repHours) {
                const hh = String(b.repHours).padStart(2, '0');
                const mm = String(b.repMinutes || '00').padStart(2, '0');
                return `${hh}:${mm} hrs`;
            }
            return 'Timing TBD';
        case 'reporting_addr':
            return b.reportingAddress || 'Reporting address as advised';
        case 'drop_addr':
            return b.dropAddress || 'Local destination';
        case 'package':
            return b.packageType || 'Standard Package';
        case 'vehicle_type':
            return b.vehicleType || 'Sedan / SUV';
        case 'vehicle_no':
            return b.vehicleNumber || 'To be allotted';
        case 'driver_name':
            return b.driverName || 'To be allotted';
        case 'driver_phone':
            return b.driverPhone || 'To be allotted';
        case 'vendor_name':
            return b.vendorName || 'Fleet Partner';
        case 'total_kms':
            return b.dutyCloseDetails?.totalKm || b.billedKm || b.totalKm || '0';
        case 'total_hours':
            return b.dutyCloseDetails?.totalHours || b.billedHours || b.totalHours || '0';
        case 'invoice_no':
            return b.dutySlipNo || b.bookingNo || 'INV-AUTO';
        case 'invoice_total': {
            const tot = b.dutyCloseDetails?.roundedGrandTotal || b.dutyCloseDetails?.grandTotal || b.invoiceAmount || 0;
            return Math.round(Number(tot) || 0).toLocaleString('en-IN');
        }
        case 'credit_days':
            if (b.creditDays) return b.creditDays;
            if (b.clientId && typeof companiesList !== 'undefined' && Array.isArray(companiesList)) {
                const comp = companiesList.find(c => c._id === b.clientId);
                if (comp && comp.creditPeriodDays) return comp.creditPeriodDays;
            }
            return '30';
        case 'cancel_reason':
            return b.cancellationReason || b.cancelReason || 'Client request / Schedule change';
        case 'broker_name':
            return (typeof brokerProfile !== 'undefined' && brokerProfile?.companyLegalName) || 'Wings Tours & Travels';
        case 'broker_phone':
            return (typeof brokerProfile !== 'undefined' && brokerProfile?.phone) || '+91 98220 12345';
        case 'broker_email':
            return (typeof brokerProfile !== 'undefined' && brokerProfile?.billingEmail) || 'dispatch@wingstravels.com';
        default:
            return '';
    }
}

// Interpolate template placeholders
function interpolateTemplate(templateStr, bookingData, customOverrides = {}) {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
        if (customOverrides[key] !== undefined && customOverrides[key] !== '') {
            return customOverrides[key];
        }
        const val = getBookingFieldValue(bookingData, key);
        return val !== '' ? val : match;
    });
}

// Auto-detect stage from booking state
function detectBookingStage(b) {
    if (!b) return 'BOOKING_CREATED';
    if (b.status === 'STATUS_CANCEL' || b.cancelled) return 'CANCELLED';
    if (b.dutyClosed || b.dutySlipUploaded || b.status === 'DR_DUTY_CLOSE') return 'DUTY_CLOSED';
    if (b.dutyStarted || b.status === 'DR_DUTY_START') return 'DUTY_STARTED';
    const hasPlotting = Boolean(b.vehicleNumber && b.driverName);
    if (hasPlotting && (b.driverAccepted === true || String(b.driverAccepted).toUpperCase() === 'YES' || b.status === 'DR_DUTY_ACCPT' || b.status === 'STATUS_YES')) {
        return 'DRIVER_ALLOTTED';
    }
    return 'BOOKING_CREATED';
}

// State for active communication modal session
let commActiveBooking = null;
let commActiveStage = 'BOOKING_CREATED';
let commActiveRecipient = 'CLIENT';

// Open Stage-Wise Communication Modal
function openCommunicationModal(bookingIdOrObject, preferredRecipient = null) {
    let b = null;
    if (bookingIdOrObject && typeof bookingIdOrObject === 'object') {
        b = bookingIdOrObject;
    } else if (typeof findBookingInList === 'function') {
        b = findBookingInList(bookingIdOrObject);
    } else if (typeof bookingsList !== 'undefined') {
        b = bookingsList.find(x => x._id === bookingIdOrObject || x.bookingNo == bookingIdOrObject || x.dutySlipNo == bookingIdOrObject);
    }

    if (!b && typeof currentActiveBooking !== 'undefined' && currentActiveBooking) {
        b = currentActiveBooking;
    }

    if (!b) {
        if (typeof showToast === 'function') showToast('No booking selected', 'error');
        return;
    }

    commActiveBooking = b;
    commActiveStage = detectBookingStage(b);

    if (preferredRecipient) {
        commActiveRecipient = preferredRecipient;
    } else if (commActiveStage === 'DRIVER_ALLOTTED' && b.driverPhone && !b.guestPhone) {
        commActiveRecipient = 'DRIVER';
    } else {
        commActiveRecipient = 'CLIENT';
    }

    // Update Modal Header Badges
    const dsBadge = document.getElementById('commDsBadge');
    if (dsBadge) dsBadge.textContent = `#${b.dutySlipNo || b.bookingNo || 'AUTO'}`;

    const statusBadge = document.getElementById('commStatusBadge');
    if (statusBadge && typeof getStatusBadgeHtml === 'function') {
        statusBadge.innerHTML = getStatusBadgeHtml(b.status || computeBookingStatusClient(b));
    }

    const guestSummary = document.getElementById('commGuestSummary');
    if (guestSummary) {
        guestSummary.textContent = `${b.guestName || 'Guest'} | ${b.clientName || 'Client'}`;
    }

    // Set UI Pills
    syncStagePillsUI();
    syncRecipientButtonsUI();
    populateTargetContactBar();
    renderCommPreview();

    if (typeof openModal === 'function') {
        openModal('communicationModal');
    } else {
        const m = document.getElementById('communicationModal');
        if (m) m.classList.add('active');
    }
}

// Helper when called from Booking Detail Sheet
function openCommunicationModalFromSheet(recipient = null) {
    const sheetData = typeof collectSheetFormData === 'function' ? collectSheetFormData() : null;
    const b = currentActiveBooking ? Object.assign({}, currentActiveBooking, sheetData || {}) : (sheetData || null);
    if (!b) {
        if (typeof showToast === 'function') showToast('Please select or open a booking first', 'error');
        return;
    }
    openCommunicationModal(b, recipient);
}

// Switch Stage inside modal
function selectCommStage(stageKey) {
    commActiveStage = stageKey;
    syncStagePillsUI();
    renderCommPreview();
}

// Switch Recipient inside modal
function selectCommRecipient(recipKey) {
    commActiveRecipient = recipKey;
    syncRecipientButtonsUI();
    populateTargetContactBar();
    renderCommPreview();
}

function syncStagePillsUI() {
    document.querySelectorAll('.comm-stage-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stage === commActiveStage);
    });
}

function syncRecipientButtonsUI() {
    const btnC = document.getElementById('btnRecipClient');
    const btnD = document.getElementById('btnRecipDriver');
    if (btnC) btnC.classList.toggle('active', commActiveRecipient === 'CLIENT');
    if (btnD) btnD.classList.toggle('active', commActiveRecipient === 'DRIVER');
}

// Populate target recipient phone & email
function populateTargetContactBar() {
    const b = commActiveBooking;
    if (!b) return;

    const nameInput = document.getElementById('commTargetName');
    const phoneInput = document.getElementById('commTargetPhone');
    const emailInput = document.getElementById('commTargetEmail');

    if (commActiveRecipient === 'CLIENT') {
        if (nameInput) nameInput.value = b.guestName || '';
        if (phoneInput) phoneInput.value = b.guestPhone || b.bookedByPhone || '';
        if (emailInput) {
            let email = b.guestEmail || b.bookedByEmail || '';
            if (!email && b.clientId && typeof companiesList !== 'undefined' && Array.isArray(companiesList)) {
                const comp = companiesList.find(c => c._id === b.clientId);
                if (comp && comp.billingEmail) email = comp.billingEmail;
            }
            emailInput.value = email;
        }
    } else {
        // DRIVER
        if (nameInput) nameInput.value = b.driverName || 'Driver';
        if (phoneInput) phoneInput.value = b.driverPhone || '';
        if (emailInput) emailInput.value = b.vendorEmail || '';
    }

    onCommPhoneChanged();
}

function onCommPhoneChanged() {
    const phoneInput = document.getElementById('commTargetPhone');
    const valTag = document.getElementById('commPhoneValidationTag');
    if (!phoneInput || !valTag) return;

    const parsed = formatWhatsAppPhone(phoneInput.value);
    if (!phoneInput.value.trim()) {
        valTag.textContent = 'Phone empty';
        valTag.style.color = '#94a3b8';
    } else if (parsed.isValid) {
        valTag.textContent = `WA Ready: ${parsed.display}`;
        valTag.style.color = '#16a34a';
    } else {
        valTag.textContent = 'Invalid format';
        valTag.style.color = '#ef4444';
    }
}

// Render dynamic preview
function renderCommPreview() {
    const b = commActiveBooking;
    if (!b) return;

    const templates = getEffectiveTemplates();
    const stageTemplates = templates[commActiveStage] || templates['BOOKING_CREATED'];
    const activeTemplate = stageTemplates[commActiveRecipient] || stageTemplates['CLIENT'] || {};

    const targetName = document.getElementById('commTargetName')?.value?.trim();
    const overrides = {};
    if (targetName) {
        if (commActiveRecipient === 'CLIENT') overrides['guest_name'] = targetName;
        else overrides['driver_name'] = targetName;
    }

    const waText = interpolateTemplate(activeTemplate.whatsapp || '', b, overrides);
    const emailSubj = interpolateTemplate(activeTemplate.emailSubject || '', b, overrides);
    const emailBody = interpolateTemplate(activeTemplate.emailBody || '', b, overrides);

    const waTextarea = document.getElementById('commWhatsAppText');
    const subjInput = document.getElementById('commEmailSubject');
    const bodyTextarea = document.getElementById('commEmailBody');

    if (waTextarea) waTextarea.value = waText;
    if (subjInput) subjInput.value = emailSubj;
    if (bodyTextarea) bodyTextarea.value = emailBody;
}

// Reset preview back to standard template
function resetCommToDefaults() {
    populateTargetContactBar();
    renderCommPreview();
    if (typeof showToast === 'function') showToast('Re-interpolated message from template');
}

// Copy WhatsApp Message
async function copyWhatsAppMessage() {
    const text = document.getElementById('commWhatsAppText')?.value || '';
    if (!text.trim()) {
        if (typeof showToast === 'function') showToast('Message text is empty', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        if (typeof showToast === 'function') showToast('WhatsApp message copied to clipboard!');
        recordCommAuditLog('MESSAGE_COPIED', commActiveBooking?.dutySlipNo || commActiveBooking?.bookingNo, commActiveRecipient, document.getElementById('commTargetPhone')?.value, commActiveStage, 'WHATSAPP');
    } catch (err) {
        // Fallback for older browsers
        const ta = document.getElementById('commWhatsAppText');
        if (ta) {
            ta.select();
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast('WhatsApp message copied!');
            recordCommAuditLog('MESSAGE_COPIED', commActiveBooking?.dutySlipNo || commActiveBooking?.bookingNo, commActiveRecipient, document.getElementById('commTargetPhone')?.value, commActiveStage, 'WHATSAPP');
        }
    }
}

// Open WhatsApp Chat via wa.me
function openWhatsAppChat() {
    const phoneInput = document.getElementById('commTargetPhone')?.value || '';
    const parsed = formatWhatsAppPhone(phoneInput);
    if (!parsed.isValid) {
        if (typeof showToast === 'function') showToast('Please enter a valid 10-digit mobile number for WhatsApp', 'error');
        document.getElementById('commTargetPhone')?.focus();
        return;
    }

    const text = document.getElementById('commWhatsAppText')?.value || '';
    const url = `https://wa.me/${parsed.formatted}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    recordCommAuditLog('WHATSAPP_OPENED', commActiveBooking?.dutySlipNo || commActiveBooking?.bookingNo, commActiveRecipient, parsed.formatted, commActiveStage, 'WHATSAPP');
    if (typeof showToast === 'function') showToast(`Opened WhatsApp chat for ${parsed.display}`);
}

// Copy Email
async function copyEmailMessage() {
    const subj = document.getElementById('commEmailSubject')?.value || '';
    const body = document.getElementById('commEmailBody')?.value || '';
    const full = `Subject: ${subj}\n\n${body}`;

    try {
        await navigator.clipboard.writeText(full);
        if (typeof showToast === 'function') showToast('Email Subject & Body copied to clipboard!');
        recordCommAuditLog('MESSAGE_COPIED', commActiveBooking?.dutySlipNo || commActiveBooking?.bookingNo, commActiveRecipient, document.getElementById('commTargetEmail')?.value, commActiveStage, 'EMAIL');
    } catch (err) {
        if (typeof showToast === 'function') showToast('Email copied!');
    }
}

// Open Mail Client via mailto:
function openEmailDraft() {
    const email = document.getElementById('commTargetEmail')?.value?.trim() || '';
    const subj = document.getElementById('commEmailSubject')?.value || '';
    const body = document.getElementById('commEmailBody')?.value || '';

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    recordCommAuditLog('EMAIL_OPENED', commActiveBooking?.dutySlipNo || commActiveBooking?.bookingNo, commActiveRecipient, email || 'No recipient email', commActiveStage, 'EMAIL');
    if (typeof showToast === 'function') showToast('Opened default email client');
}

// Record Communication Action in Audit Logs API
async function recordCommAuditLog(actionType, targetNo, recipientType, contact, stageKey, channel = '') {
    try {
        const payload = {
            action: actionType,
            action_type: actionType,
            entityType: 'BOOKING',
            target_entity: 'BOOKING',
            entityId: String(targetNo || 'N/A'),
            target_id: String(targetNo || 'N/A'),
            entityName: `Booking #${targetNo || 'N/A'}`,
            summary: `${actionType.replace('_', ' ')} (${channel}) to ${recipientType} (${contact || 'N/A'}) - Stage: ${stageKey}`,
            details: {
                action: actionType,
                channel,
                stage: stageKey,
                recipient: recipientType,
                contact: contact || ''
            }
        };

        if (typeof fetchAuth === 'function') {
            await fetchAuth(`${API_BASE}/aggregator/audit-logs`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
    } catch (e) {
        console.warn('Could not record communication audit log:', e);
    }
}

// Insert variable into active textarea
function insertVariable(varTag) {
    if (typeof showToast === 'function') showToast(`Copied ${varTag} to clipboard!`);
    try {
        navigator.clipboard.writeText(varTag);
    } catch (e) {}
}

/* ==========================================================================
   ADMIN TEMPLATE CUSTOMIZATION CONTROLLER (PROFILE & ADMIN.HTML)
   ========================================================================== */

function loadSelectedTemplateInEditor() {
    const stage = document.getElementById('tplEditorStage')?.value || 'BOOKING_CREATED';
    const recip = document.getElementById('tplEditorRecipient')?.value || 'CLIENT';
    const templates = getEffectiveTemplates();

    const tpl = (templates[stage] && templates[stage][recip]) || {};
    const waEl = document.getElementById('tplEditorWhatsApp');
    const subjEl = document.getElementById('tplEditorEmailSubject');
    const bodyEl = document.getElementById('tplEditorEmailBody');

    if (waEl) waEl.value = tpl.whatsapp || '';
    if (subjEl) subjEl.value = tpl.emailSubject || '';
    if (bodyEl) bodyEl.value = tpl.emailBody || '';
}

function saveAdminCustomTemplates() {
    const stage = document.getElementById('tplEditorStage')?.value || 'BOOKING_CREATED';
    const recip = document.getElementById('tplEditorRecipient')?.value || 'CLIENT';

    const wa = document.getElementById('tplEditorWhatsApp')?.value || '';
    const subj = document.getElementById('tplEditorEmailSubject')?.value || '';
    const body = document.getElementById('tplEditorEmailBody')?.value || '';

    const templates = getEffectiveTemplates();
    if (!templates[stage]) templates[stage] = {};
    templates[stage][recip] = {
        whatsapp: wa,
        emailSubject: subj,
        emailBody: body
    };

    localStorage.setItem('wings_msg_templates', JSON.stringify(templates));
    if (typeof showToast === 'function') showToast('Templates saved successfully!');

    const hint = document.getElementById('tplEditorStatusHint');
    if (hint) {
        hint.textContent = 'Saved!';
        setTimeout(() => { hint.textContent = ''; }, 3000);
    }
}

function resetAdminTemplatesToDefault() {
    if (!confirm('Are you sure you want to reset all message templates to system defaults?')) return;
    localStorage.removeItem('wings_msg_templates');
    loadSelectedTemplateInEditor();
    if (typeof showToast === 'function') showToast('Message templates reset to system defaults!');
}

// Synchronizer for admin.html template view
function loadSelectedTemplateInAdmin() {
    const stage = document.getElementById('tplEditorStageAdmin')?.value || 'BOOKING_CREATED';
    const recip = document.getElementById('tplEditorRecipientAdmin')?.value || 'CLIENT';
    const templates = getEffectiveTemplates();

    const tpl = (templates[stage] && templates[stage][recip]) || {};
    const waEl = document.getElementById('tplAdminWhatsApp');
    const subjEl = document.getElementById('tplAdminEmailSubject');
    const bodyEl = document.getElementById('tplAdminEmailBody');

    if (waEl) waEl.value = tpl.whatsapp || '';
    if (subjEl) subjEl.value = tpl.emailSubject || '';
    if (bodyEl) bodyEl.value = tpl.emailBody || '';
}

function saveAdminTemplatesFromAdminHtml() {
    const stage = document.getElementById('tplEditorStageAdmin')?.value || 'BOOKING_CREATED';
    const recip = document.getElementById('tplEditorRecipientAdmin')?.value || 'CLIENT';

    const wa = document.getElementById('tplAdminWhatsApp')?.value || '';
    const subj = document.getElementById('tplAdminEmailSubject')?.value || '';
    const body = document.getElementById('tplAdminEmailBody')?.value || '';

    const templates = getEffectiveTemplates();
    if (!templates[stage]) templates[stage] = {};
    templates[stage][recip] = {
        whatsapp: wa,
        emailSubject: subj,
        emailBody: body
    };

    localStorage.setItem('wings_msg_templates', JSON.stringify(templates));
    const hint = document.getElementById('tplAdminStatusHint');
    if (hint) {
        hint.textContent = 'Saved!';
        setTimeout(() => { hint.textContent = ''; }, 3000);
    }
    alert('Message templates saved successfully!');
}

function resetAdminTemplatesFromAdminHtml() {
    if (!confirm('Are you sure you want to reset all message templates to system defaults?')) return;
    localStorage.removeItem('wings_msg_templates');
    loadSelectedTemplateInAdmin();
    alert('Message templates reset to system defaults!');
}

// Explicit window bindings to guarantee global availability in all browsers
if (typeof window !== 'undefined') {
    window.DEFAULT_MESSAGE_TEMPLATES = DEFAULT_MESSAGE_TEMPLATES;
    window.getEffectiveTemplates = getEffectiveTemplates;
    window.formatWhatsAppPhone = formatWhatsAppPhone;
    window.getBookingFieldValue = getBookingFieldValue;
    window.interpolateTemplate = interpolateTemplate;
    window.detectBookingStage = detectBookingStage;
    window.openCommunicationModal = openCommunicationModal;
    window.openCommunicationModalFromSheet = openCommunicationModalFromSheet;
    window.selectCommStage = selectCommStage;
    window.selectCommRecipient = selectCommRecipient;
    window.syncStagePillsUI = syncStagePillsUI;
    window.syncRecipientButtonsUI = syncRecipientButtonsUI;
    window.populateTargetContactBar = populateTargetContactBar;
    window.onCommPhoneChanged = onCommPhoneChanged;
    window.renderCommPreview = renderCommPreview;
    window.resetCommToDefaults = resetCommToDefaults;
    window.copyWhatsAppMessage = copyWhatsAppMessage;
    window.openWhatsAppChat = openWhatsAppChat;
    window.copyEmailMessage = copyEmailMessage;
    window.openEmailDraft = openEmailDraft;
    window.recordCommAuditLog = recordCommAuditLog;
    window.insertVariable = insertVariable;
    window.loadSelectedTemplateInEditor = loadSelectedTemplateInEditor;
    window.saveAdminCustomTemplates = saveAdminCustomTemplates;
    window.resetAdminTemplatesToDefault = resetAdminTemplatesToDefault;
    window.loadSelectedTemplateInAdmin = loadSelectedTemplateInAdmin;
    window.saveAdminTemplatesFromAdminHtml = saveAdminTemplatesFromAdminHtml;
    window.resetAdminTemplatesFromAdminHtml = resetAdminTemplatesFromAdminHtml;
}

