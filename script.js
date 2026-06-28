// Global API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://wings-backend-jada.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. PRELOADER & SCROLL TO TOP
       ========================================================================== */
    const preloader = document.getElementById('preloader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (preloader) {
                preloader.classList.add('fade-out');
            }
        }, 600); // Small delay for a smooth initial animation
    });

    const scrollToTopBtn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });


    /* ==========================================================================
       2. NAVBAR STICKY & ACTIVE LINK ON SCROLL
       ========================================================================== */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navBackdrop = document.getElementById('navBackdrop');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            if (navBackdrop) navBackdrop.classList.toggle('active');
        });
    }

    // Close menu helper
    function closeMenu() {
        if (navToggle) navToggle.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
        if (navBackdrop) navBackdrop.classList.remove('active');
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close menu when clicking the backdrop
    if (navBackdrop) {
        navBackdrop.addEventListener('click', closeMenu);
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu && navToggle && navMenu.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !navToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // Track active navigation link on scroll
    const sections = document.querySelectorAll('section, header');
    window.addEventListener('scroll', () => {
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 150)) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    });


    /* ==========================================================================
       3. INTERSECTION OBSERVER FOR SCROLL REVEALS
       ========================================================================== */
    const revealElements = document.querySelectorAll(
        '.reveal-fade-in, .reveal-slide-up, .reveal-slide-left, .reveal-slide-right'
    );

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Trigger only once
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));


    /* ==========================================================================
       4. ANIMATED COUNTERS FOR STATS
       ========================================================================== */
    const statsGrid = document.getElementById('statsGrid');
    const statNumbers = document.querySelectorAll('.stat-number');
    let countersStarted = false;

    const startCounters = () => {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'), 10);
            const duration = 2000; // 2 seconds animation
            const increment = target / (duration / 16); // ~60fps
            let current = 0;

            const updateCount = () => {
                current += increment;
                if (current < target) {
                    stat.innerText = Math.floor(current);
                    requestAnimationFrame(updateCount);
                } else {
                    stat.innerText = target;
                }
            };
            updateCount();
        });
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersStarted) {
                countersStarted = true;
                startCounters();
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    if (statsGrid) {
        statsObserver.observe(statsGrid);
    }


    /* ==========================================================================
       5. CLIENT REVIEW SLIDER (TESTIMONIALS)
       ========================================================================== */
    const reviewsSlider = document.getElementById('reviewsSlider');
    const slides = document.querySelectorAll('.review-slide');
    const sliderPrev = document.getElementById('sliderPrev');
    const sliderNext = document.getElementById('sliderNext');
    const sliderDotsContainer = document.getElementById('sliderDots');
    let currentSlide = 0;
    let slideCount = slides.length;
    let autoSlideInterval;

    // Create dots dynamically
    if (sliderDotsContainer) {
        slides.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(idx));
            sliderDotsContainer.appendChild(dot);
        });
    }

    let dots = document.querySelectorAll('.dot');

    const updateSliderUI = () => {
        if (!reviewsSlider) return;
        reviewsSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
        const currentSlides = reviewsSlider.querySelectorAll('.review-slide');
        currentSlides.forEach((slide, idx) => {
            if (idx === currentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });
        dots = document.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx === currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    };

    const goToSlide = (index) => {
        if (!reviewsSlider || slideCount <= 1) return;
        currentSlide = index;
        if (currentSlide >= slideCount) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slideCount - 1;
        updateSliderUI();
        resetAutoSlide();
    };

    const nextSlide = () => {
        if (!reviewsSlider || slideCount <= 1) return;
        goToSlide(currentSlide + 1);
    };

    const prevSlide = () => {
        if (!reviewsSlider || slideCount <= 1) return;
        goToSlide(currentSlide - 1);
    };

    if (sliderNext) sliderNext.addEventListener('click', nextSlide);
    if (sliderPrev) sliderPrev.addEventListener('click', prevSlide);

    const startAutoSlide = () => {
        if (!reviewsSlider || slideCount <= 1) return;
        autoSlideInterval = setInterval(nextSlide, 5000); // Slide every 5 seconds
    };

    const resetAutoSlide = () => {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    };

    if (reviewsSlider && slideCount > 1) {
        startAutoSlide();
    }


    /* ==========================================================================
       6. MASONRY GALLERY FILTER & LIGHTBOX SYSTEM
       ========================================================================== */
    const filterButtons = document.querySelectorAll('.filter-btn');
    let galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-img') : null;
    const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;
    const lightboxCaption = lightbox ? lightbox.querySelector('.lightbox-caption') : null;
    const lightboxPrev = lightbox ? lightbox.querySelector('.lightbox-prev') : null;
    const lightboxNext = lightbox ? lightbox.querySelector('.lightbox-next') : null;
    
    let activeGalleryItems = Array.from(galleryItems);
    let currentLightboxIdx = 0;

    // Filtering logic
    const setupGalleryFiltering = () => {
        const btns = document.querySelectorAll('.filter-btn');
        const items = document.querySelectorAll('.gallery-item');
        
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');
                activeGalleryItems = [];

                items.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filterValue === 'all' || category === filterValue) {
                        item.style.display = 'block';
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'scale(1)';
                        }, 50);
                        activeGalleryItems.push(item);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    };

    // Lightbox modal logic
    const openLightbox = (index) => {
        currentLightboxIdx = index;
        const currentItem = activeGalleryItems[currentLightboxIdx];
        if (!currentItem || !lightboxImg || !lightboxCaption) return;
        
        const img = currentItem.querySelector('.gallery-img');
        const titleText = currentItem.querySelector('.gallery-title').innerText;
        const categoryText = currentItem.querySelector('.gallery-cat').innerText;

        lightboxImg.src = img.src;
        lightboxCaption.innerHTML = `<strong>${titleText}</strong> - ${categoryText}`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop page scrolling
    };

    const closeLightbox = () => {
        if (lightbox) {
            lightbox.classList.remove('active');
        }
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    };

    const bindLightboxClickHandlers = () => {
        const items = document.querySelectorAll('.gallery-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const idx = activeGalleryItems.indexOf(item);
                if (idx !== -1) {
                    openLightbox(idx);
                }
            });
        });
    };

    setupGalleryFiltering();
    bindLightboxClickHandlers();

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }
    
    // Close lightbox on click outside the image
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // Navigate inside lightbox
    const navigateLightbox = (direction) => {
        if (!lightboxImg || !lightboxCaption) return;
        currentLightboxIdx += direction;
        if (currentLightboxIdx >= activeGalleryItems.length) currentLightboxIdx = 0;
        if (currentLightboxIdx < 0) currentLightboxIdx = activeGalleryItems.length - 1;
        
        const nextItem = activeGalleryItems[currentLightboxIdx];
        if (nextItem) {
            const img = nextItem.querySelector('.gallery-img');
            const titleText = nextItem.querySelector('.gallery-title').innerText;
            const categoryText = nextItem.querySelector('.gallery-cat').innerText;

            lightboxImg.src = img.src;
            lightboxCaption.innerHTML = `<strong>${titleText}</strong> - ${categoryText}`;
        }
    };

    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(-1);
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(1);
        });
    }

    // Keyboard support for Lightbox
    window.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigateLightbox(1);
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
    });


    /* ==========================================================================
       7. PACKAGES TO BOOKING BINDING
       ========================================================================= */
    const bindPackageButtons = () => {
        const packageBookBtns = document.querySelectorAll('.package-book-btn');
        const selectService = document.getElementById('bookingService');
        const messageTextarea = document.getElementById('bookingMessage');
        const destinationInput = document.getElementById('bookingDestination');

        packageBookBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packageName = btn.getAttribute('data-package');
                
                // Set service dropdown to 'Tour Packages'
                if (selectService) {
                    selectService.value = 'Tour Packages';
                }
                
                // Fill destination field
                if (destinationInput) {
                    const destinationMap = {
                        'Goa Tour Package': 'Goa',
                        'Mahabaleshwar Tour Package': 'Mahabaleshwar',
                        'Shirdi Darshan Package': 'Shirdi Sai Temple',
                        'Lonavala Package': 'Lonavala & Khandala',
                        'Konkan Tour Package': 'Konkan Coastline',
                        'Custom Tour Package': ''
                    };
                    destinationInput.value = destinationMap[packageName] || packageName.replace(' Tour Package', '').replace(' Package', '');
                }

                // Fill message field with pre-written request
                if (messageTextarea) {
                    messageTextarea.value = `I am interested in booking the "${packageName}". Please send details and quotation.`;
                }

                // Smooth scroll to booking section
                const bookingSection = document.getElementById('booking');
                if (bookingSection) {
                    bookingSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    };

    bindPackageButtons();

    /* ==========================================================================
       7b. SERVICE-SPECIFIC MODAL SYSTEM
       ========================================================================== */
    const initServiceSpecificModal = () => {
        const serviceCards = document.querySelectorAll('.clickable-service-card');
        const serviceModal = document.getElementById('serviceModal');
        const closeServiceModalBtn = document.getElementById('closeServiceModalBtn');
        const serviceModalForm = document.getElementById('serviceModalForm');
        
        // Modal DOM elements
        const modalTitle = document.getElementById('serviceModalTitle');
        const modalSubtitle = document.getElementById('serviceModalSubtitle');
        const modalServiceInput = document.getElementById('serviceModalService');
        
        const dynamicRow = document.getElementById('serviceModalDynamicRow');
        const vehicleGroup = document.getElementById('serviceModalVehicleGroup');
        const vehicleSelect = document.getElementById('serviceModalVehicle');
        const durationGroup = document.getElementById('serviceModalDurationGroup');
        const durationSelect = document.getElementById('serviceModalDuration');
        const packageGroup = document.getElementById('serviceModalPackageGroup');
        const packageSelect = document.getElementById('serviceModalPackage');

        const phoneInput = document.getElementById('serviceModalPhone');

        if (!serviceModal || !serviceModalForm) return;

        // Force numeric input for phone field
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }

        // Vehicle options config
        const vehicleOptions = {
            taxi: [
                { value: '', label: 'Select preferred vehicle *' },
                { value: 'Sedan (Dzire/Etios)', label: 'Sedan (Swift Dzire / Toyota Etios)' },
                { value: 'SUV (Suzuki Ertiga)', label: 'SUV (Suzuki Ertiga - 6+1 Seater)' },
                { value: 'Premium SUV (Innova Crysta)', label: 'Premium SUV (Toyota Innova Crysta)' },
                { value: 'Hatchback (WagonR/Swift)', label: 'Hatchback (Maruti WagonR / Swift)' },
                { value: 'Tempo Traveller (17 Seater)', label: 'Tempo Traveller (17 Seater)' }
            ],
            bus: [
                { value: '', label: 'Select preferred coach/bus *' },
                { value: '17-Seater Tempo Traveller', label: '17-Seater Tempo Traveller' },
                { value: '26-Seater Mini Bus', label: '26-Seater Mini Bus' },
                { value: '32-Seater Luxury Coach', label: '32-Seater Luxury Coach' },
                { value: '45-Seater Luxury Volvo Bus', label: '45-Seater Luxury Volvo Bus' },
                { value: '50-Seater Deluxe Bus', label: '50-Seater Deluxe Bus' }
            ]
        };

        const populateVehicleOptions = (type) => {
            if (!vehicleSelect) return;
            vehicleSelect.innerHTML = '';
            vehicleOptions[type].forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.label;
                if (opt.value === '') {
                    optionEl.disabled = true;
                    optionEl.selected = true;
                }
                vehicleSelect.appendChild(optionEl);
            });
        };

        // Click handlers on service cards
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                const serviceName = card.getAttribute('data-service');
                if (!serviceName) return;

                // Reset form validation states and fields
                serviceModalForm.reset();
                const invalidFields = serviceModalForm.querySelectorAll('.form-group.invalid');
                invalidFields.forEach(el => el.classList.remove('invalid'));

                // Set Service Hidden Input
                modalServiceInput.value = serviceName;

                // Setup dynamic fields based on service name
                let showVehicle = false;
                let showDuration = false;
                let showPackage = false;
                let vehicleType = 'taxi';

                // Setup title, subtitle, and fields
                if (serviceName === 'Local Taxi') {
                    modalTitle.innerText = 'Book Local Taxi';
                    modalSubtitle.innerText = 'Fast, affordable, and safe city rides & airport transfers.';
                    showVehicle = true;
                    populateVehicleOptions('taxi');
                } else if (serviceName === 'Outstation Taxi') {
                    modalTitle.innerText = 'Book Outstation Taxi';
                    modalSubtitle.innerText = 'Comfortable one-way or round trips at the best outstation rates.';
                    showVehicle = true;
                    populateVehicleOptions('taxi');
                } else if (serviceName === 'Hourly Rental') {
                    modalTitle.innerText = 'Book Hourly Car Rental';
                    modalSubtitle.innerText = 'Chauffeur-driven private car rental at your disposal by the hour.';
                    showVehicle = true;
                    showDuration = true;
                    populateVehicleOptions('taxi');
                } else if (serviceName === 'Picnic Trips') {
                    modalTitle.innerText = 'Book Picnic & Weekend Trip';
                    modalSubtitle.innerText = 'Spacious family vehicles for delightful weekend day-outs.';
                    showVehicle = true;
                    populateVehicleOptions('taxi');
                } else if (serviceName === 'Bus Services') {
                    modalTitle.innerText = 'Book Bus & Coach Services';
                    modalSubtitle.innerText = 'Luxury mini-buses and large coaches for weddings, events & groups.';
                    showVehicle = true;
                    vehicleType = 'bus';
                    populateVehicleOptions('bus');
                } else if (serviceName === 'Tour Packages') {
                    modalTitle.innerText = 'Inquire Tour Package';
                    modalSubtitle.innerText = 'Explore our handcrafted premium travel package itineraries.';
                    showPackage = true;
                }

                // Show/Hide DOM elements and toggle required attributes
                if (showVehicle) {
                    vehicleGroup.style.display = 'flex';
                    vehicleSelect.required = true;
                } else {
                    vehicleGroup.style.display = 'none';
                    vehicleSelect.required = false;
                    vehicleSelect.value = '';
                }

                if (showDuration) {
                    durationGroup.style.display = 'flex';
                    durationSelect.required = true;
                } else {
                    durationGroup.style.display = 'none';
                    durationSelect.required = false;
                    durationSelect.value = '';
                }

                if (showPackage) {
                    packageGroup.style.display = 'flex';
                    packageSelect.required = true;
                } else {
                    packageGroup.style.display = 'none';
                    packageSelect.required = false;
                    packageSelect.value = '';
                }

                // Adjust grid layout dynamically
                if (showVehicle && showDuration) {
                    dynamicRow.style.display = 'grid';
                    dynamicRow.style.gridTemplateColumns = '1fr 1fr';
                    dynamicRow.style.gap = '16px';
                } else if (showVehicle || showPackage) {
                    dynamicRow.style.display = 'grid';
                    dynamicRow.style.gridTemplateColumns = '1fr';
                    dynamicRow.style.gap = '0';
                } else {
                    dynamicRow.style.display = 'none';
                }

                // Show Modal
                serviceModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        // Close Modal
        const closeModal = () => {
            serviceModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        if (closeServiceModalBtn) {
            closeServiceModalBtn.addEventListener('click', closeModal);
        }

        // Close modal clicking outside
        serviceModal.addEventListener('click', (e) => {
            if (e.target === serviceModal) {
                closeModal();
            }
        });

        // Validation helper for service modal
        const validateModalField = (inputElement) => {
            const formGroup = inputElement.closest('.form-group');
            if (!formGroup) return true;
            let isValid = true;

            if (inputElement.required && !inputElement.value.trim()) {
                isValid = false;
            } else if (inputElement.type === 'tel') {
                const phoneRegex = /^[0-9]{10}$/;
                if (!phoneRegex.test(inputElement.value)) {
                    isValid = false;
                }
            } else if (inputElement.type === 'number') {
                const min = parseInt(inputElement.min, 10);
                const max = parseInt(inputElement.max, 10);
                const val = parseInt(inputElement.value, 10);
                if (isNaN(val) || (min && val < min) || (max && val > max)) {
                    isValid = false;
                }
            }

            if (isValid) {
                formGroup.classList.remove('invalid');
            } else {
                formGroup.classList.add('invalid');
            }

            return isValid;
        };

        // Attach listeners to fields in modal
        const modalFields = serviceModalForm.querySelectorAll('input, select, textarea');
        modalFields.forEach(field => {
            field.addEventListener('blur', () => {
                if (field.required || field.type === 'tel') {
                    validateModalField(field);
                }
            });
            field.addEventListener('change', () => {
                if (field.required || field.type === 'tel') {
                    validateModalField(field);
                }
            });
            field.addEventListener('input', () => {
                const group = field.closest('.form-group');
                if (group && group.classList.contains('invalid')) {
                    validateModalField(field);
                }
            });
        });

        // Form Submit
        serviceModalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isFormValid = true;

            // Validate only visible and required fields
            modalFields.forEach(field => {
                const group = field.closest('.form-group');
                const isVisible = group ? (group.style.display !== 'none' && group.closest('#serviceModalDynamicRow') ? group.closest('#serviceModalDynamicRow').style.display !== 'none' : true) : true;
                
                if (isVisible && (field.required || field.type === 'tel')) {
                    const isFieldValid = validateModalField(field);
                    if (!isFieldValid) {
                        isFormValid = false;
                    }
                }
            });

            if (isFormValid) {
                // Extract values
                const name = document.getElementById('serviceModalName').value.trim();
                const phone = document.getElementById('serviceModalPhone').value.trim();
                const pickup = document.getElementById('serviceModalPickup').value.trim();
                const destination = document.getElementById('serviceModalDestination').value.trim();
                const date = document.getElementById('serviceModalDate').value;
                const people = document.getElementById('serviceModalPeople').value;
                const service = modalServiceInput.value;
                const userMsg = document.getElementById('serviceModalMessage').value.trim();

                // Get dynamic field values
                const vehicleVal = vehicleGroup.style.display !== 'none' && vehicleSelect.value ? vehicleSelect.value : null;
                const durationVal = durationGroup.style.display !== 'none' && durationSelect.value ? durationSelect.value : null;
                const packageVal = packageGroup.style.display !== 'none' && packageSelect.value ? packageSelect.value : null;

                // Build a structured message
                let messageParts = [];
                if (vehicleVal) messageParts.push(`Vehicle: ${vehicleVal}`);
                if (durationVal) messageParts.push(`Duration: ${durationVal}`);
                if (packageVal) messageParts.push(`Package: ${packageVal}`);
                if (userMsg) messageParts.push(`Request: ${userMsg}`);
                
                const finalMessage = messageParts.join(' | ');

                // Submit to backend
                fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        phone,
                        pickup,
                        destination,
                        travel_date: date,
                        people,
                        service,
                        message: finalMessage
                    })
                })
                .then(res => res.json())
                .then(data => {
                    console.log('Modal API booking success:', data);
                })
                .catch(err => {
                    console.warn('Modal API booking save failed/offline:', err);
                });

                // Generate WhatsApp share text
                let whatsappText = `Hi Wings Tours & Travels,
I'd like to book a ride:
- *Name:* ${name}
- *Phone:* ${phone}
- *Service:* ${service}`;

                if (vehicleVal) whatsappText += `\n- *Vehicle:* ${vehicleVal}`;
                if (durationVal) whatsappText += `\n- *Duration:* ${durationVal}`;
                if (packageVal) whatsappText += `\n- *Package:* ${packageVal}`;
                
                whatsappText += `\n- *Pickup:* ${pickup}
- *Destination:* ${destination}
- *Date:* ${date}
- *Travellers:* ${people}`;

                if (userMsg) {
                    whatsappText += `\n- *Message:* ${userMsg}`;
                }

                const encodedText = encodeURIComponent(whatsappText);
                const successWhatsAppBtn = document.getElementById('successWhatsAppBtn');
                if (successWhatsAppBtn) {
                    successWhatsAppBtn.href = `https://wa.me/918855052083?text=${encodedText}`;
                }

                // Show Success Modal
                const successModal = document.getElementById('successModal');
                const successCustomerName = document.getElementById('successCustomerName');
                const successCustomerPhone = document.getElementById('successCustomerPhone');

                if (successCustomerName) successCustomerName.innerText = name;
                if (successCustomerPhone) successCustomerPhone.innerText = phone;

                // Close Service Modal
                closeModal();

                if (successModal) {
                    successModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }

                // Reset Form
                serviceModalForm.reset();
            } else {
                // Scroll to the first invalid field in modal
                const firstInvalid = serviceModalForm.querySelector('.form-group.invalid');
                if (firstInvalid) {
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    };

    initServiceSpecificModal();


    /* ==========================================================================
       8. BOOKING FORM VALIDATION & CONFIRMATION MODAL
       ========================================================================== */
    const bookingForm = document.getElementById('bookingForm');
    const successModal = document.getElementById('successModal');
    const successCustomerName = document.getElementById('successCustomerName');
    const successCustomerPhone = document.getElementById('successCustomerPhone');
    const successCloseBtn = document.getElementById('successCloseBtn');
    const successWhatsAppBtn = document.getElementById('successWhatsAppBtn');

    // Phone field validation constraint (digit only helper)
    const phoneInput = document.getElementById('bookingPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    const validateField = (inputElement) => {
        const formGroup = inputElement.closest('.form-group');
        let isValid = true;

        if (inputElement.required && !inputElement.value.trim()) {
            isValid = false;
        } else if (inputElement.type === 'tel') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(inputElement.value)) {
                isValid = false;
            }
        } else if (inputElement.type === 'number') {
            const min = parseInt(inputElement.min, 10);
            const max = parseInt(inputElement.max, 10);
            const val = parseInt(inputElement.value, 10);
            if (isNaN(val) || (min && val < min) || (max && val > max)) {
                isValid = false;
            }
        }

        if (isValid) {
            formGroup.classList.remove('invalid');
        } else {
            formGroup.classList.add('invalid');
        }

        return isValid;
    };

    // Real-time validation blur listeners
    if (bookingForm) {
        const formFields = bookingForm.querySelectorAll('input[required], select[required]');
        formFields.forEach(field => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('change', () => validateField(field));
            field.addEventListener('input', () => {
                if (field.closest('.form-group').classList.contains('invalid')) {
                    validateField(field);
                }
            });
        });

        // Form submit listener
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isFormValid = true;

            formFields.forEach(field => {
                const isFieldValid = validateField(field);
                if (!isFieldValid) {
                    isFormValid = false;
                }
            });

            if (isFormValid) {
                // Extract values
                const name = document.getElementById('bookingName').value.trim();
                const phone = document.getElementById('bookingPhone').value.trim();
                const pickup = document.getElementById('bookingPickup').value.trim();
                const destination = document.getElementById('bookingDestination').value.trim();
                const date = document.getElementById('bookingDate').value;
                const people = document.getElementById('bookingPeople').value;
                const service = document.getElementById('bookingService').value;
                const message = document.getElementById('bookingMessage').value.trim();

                // Set modal content
                if (successCustomerName) successCustomerName.innerText = name;
                if (successCustomerPhone) successCustomerPhone.innerText = phone;

                // Send to backend REST API
                fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        phone,
                        pickup,
                        destination,
                        travel_date: date,
                        people,
                        service,
                        message
                    })
                })
                .then(res => res.json())
                .then(data => {
                    console.log('API booking success:', data);
                })
                .catch(err => {
                    console.warn('API booking save failed/offline:', err);
                });

                // Generate WhatsApp share text for pre-filled chat
                const whatsappText = `Hi Wings Tours & Travels,
I'd like to book a ride:
- *Name:* ${name}
- *Phone:* ${phone}
- *Service:* ${service}
- *Pickup:* ${pickup}
- *Destination:* ${destination}
- *Date:* ${date}
- *Travellers:* ${people}
${message ? `- *Message:* ${message}` : ''}`;

                const encodedText = encodeURIComponent(whatsappText);
                if (successWhatsAppBtn) {
                    successWhatsAppBtn.href = `https://wa.me/918855052083?text=${encodedText}`;
                }

                // Show success modal
                if (successModal) {
                    successModal.classList.add('active');
                }
                document.body.style.overflow = 'hidden';

                // Reset form
                bookingForm.reset();
            } else {
                // Scroll to the first invalid field
                const firstInvalid = bookingForm.querySelector('.form-group.invalid');
                if (firstInvalid) {
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }

    if (successCloseBtn) {
        successCloseBtn.addEventListener('click', () => {
            if (successModal) successModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    // Mobile bottom bar Book Now button smooth scroll
    const mobileBookBtn = document.getElementById('mobileBookBtn');
    if (mobileBookBtn) {
        mobileBookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const bookingSection = document.getElementById('booking');
            if (bookingSection) {
                const toggleEl = document.getElementById('navToggle');
                const menuEl = document.getElementById('navMenu');
                const backdropEl = document.getElementById('navBackdrop');
                if (toggleEl && menuEl) {
                    toggleEl.classList.remove('active');
                    menuEl.classList.remove('active');
                }
                if (backdropEl) {
                    backdropEl.classList.remove('active');
                }
                bookingSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    /* ==========================================================================
       9. HERO TEXT TYPING ANIMATION
       ========================================================================== */
    const typedTextSpan = document.getElementById("typed-text");
    if (typedTextSpan) {
        const textArray = [
            "Every Journey",
            "Local Cab Booking",
            "Outstation Trips",
            "Hourly Rentals",
            "Tour Packages",
            "Safe & Reliable Rides"
        ];
        const typingSpeed = 100;
        const erasingSpeed = 60;
        const newTextDelay = 2000;
        let textArrayIndex = 0;
        let charIndex = 0;

        function type() {
            if (charIndex < textArray[textArrayIndex].length) {
                typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
                charIndex++;
                setTimeout(type, typingSpeed);
            } else {
                setTimeout(erase, newTextDelay);
            }
        }

        function erase() {
            if (charIndex > 0) {
                typedTextSpan.textContent = textArray[textArrayIndex].substring(0, charIndex - 1);
                charIndex--;
                setTimeout(erase, erasingSpeed);
            } else {
                textArrayIndex++;
                if (textArrayIndex >= textArray.length) textArrayIndex = 0;
                setTimeout(type, typingSpeed + 500);
            }
        }

        // Start typing animation
        setTimeout(type, 1000);
    }


    /* ==========================================================================
       10. BACKEND INTEGRATION (DYNAMIC FETCH & RENDER)
       ========================================================================== */
    // API_URL is defined globally at the top of this file

    // A. Dynamic Packages loading
    async function fetchDynamicPackages() {
        const grid = document.querySelector('.packages-grid');
        if (!grid) return;

        try {
            const res = await fetch(`${API_URL}/packages/featured`);
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                grid.innerHTML = ''; // Clear static ones
                data.data.forEach(pkg => {
                    const card = document.createElement('div');
                    card.className = 'package-card reveal-slide-up active'; // force active class so they are visible immediately
                    card.innerHTML = `
                        <div class="package-image-container">
                            <img src="${pkg.imageUrl}" alt="${pkg.title}" class="package-img" loading="lazy">
                            ${pkg.badge ? `<span class="package-badge">${pkg.badge}</span>` : ''}
                        </div>
                        <div class="package-content">
                            <div class="package-meta">
                                <span class="package-duration"><i class="bi bi-clock"></i> ${pkg.duration}</span>
                                <span class="package-rating"><i class="bi bi-star-fill"></i> ${pkg.rating}</span>
                            </div>
                            <h3 class="package-title">${pkg.title}</h3>
                            <p class="package-description">${pkg.description}</p>
                            <div class="package-footer">
                                <div class="package-price-box">
                                    <span class="price-label">Price Details</span>
                                    <span class="package-price">${pkg.price}</span>
                                </div>
                                <button class="btn package-book-btn" data-package="${pkg.title}">Book Now <i class="bi bi-arrow-right-short"></i></button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
                
                // Re-bind package button listeners
                bindPackageButtons();
            }
        } catch (err) {
            console.warn('Backend packages API unavailable. Using static fallback packages.');
        }
    }

    // B. Dynamic Gallery Loading
    async function fetchDynamicGallery() {
        const grid = document.getElementById('galleryGrid');
        if (!grid) return;

        try {
            const res = await fetch(`${API_URL}/gallery`);
            const data = await res.json();

            grid.innerHTML = ''; // Always clear static/default templates first

            if (data.success && data.data.length > 0) {
                data.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'gallery-item reveal-fade-in active';
                    div.setAttribute('data-category', item.category);
                    div.innerHTML = `
                        <div class="gallery-image-wrapper">
                            <img src="${item.imageUrl}" alt="${item.title}" class="gallery-img" loading="lazy">
                            <div class="gallery-overlay">
                                <span class="gallery-cat">${
                                    item.category === 'cars' ? 'Luxury Cars' : 
                                    item.category === 'buses' ? 'Tempo & Buses' : 
                                    item.category === 'destinations' ? 'Destinations' : 'Trips & Travelers'
                                }</span>
                                <h3 class="gallery-title">${item.title}</h3>
                                <div class="gallery-view-btn">
                                    <i class="bi bi-plus-lg"></i>
                                </div>
                            </div>
                        </div>
                    `;
                    grid.appendChild(div);
                });

                // Update references and set up triggers
                galleryItems = document.querySelectorAll('.gallery-item');
                activeGalleryItems = Array.from(galleryItems);
                setupGalleryFiltering();
                bindLightboxClickHandlers();
            } else {
                grid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-images" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No gallery images uploaded yet.</p></div>';
            }
        } catch (err) {
            console.warn('Backend gallery API unavailable.');
            grid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-images" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No gallery images available at the moment.</p></div>';
        }
    }

    // C. Dynamic Reviews Loading
    async function fetchDynamicReviews() {
        const slider = document.getElementById('reviewsSlider');
        const dotsContainer = document.getElementById('sliderDots');
        if (!slider || !dotsContainer) return;

        try {
            const res = await fetch(`${API_URL}/reviews`);
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                slider.innerHTML = ''; // Clear static slides
                dotsContainer.innerHTML = ''; // Clear static dots
                
                data.data.forEach((rev, idx) => {
                    const slide = document.createElement('div');
                    slide.className = `review-slide ${idx === 0 ? 'active' : ''}`;
                    
                    let starsHtml = '';
                    for (let i = 0; i < 5; i++) {
                        starsHtml += i < rev.rating ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
                    }

                    slide.innerHTML = `
                        <div class="review-card">
                            <div class="review-stars">
                                ${starsHtml}
                            </div>
                            <p class="review-text">"${rev.text}"</p>
                            <div class="review-user">
                                <img src="${rev.authorPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}" alt="${rev.authorName}" class="user-avatar" loading="lazy">
                                <div class="user-info">
                                    <h4>${rev.authorName}</h4>
                                    <p>${rev.tripType || 'Verified Customer'}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    slider.appendChild(slide);
                });

                // Reinitialize slider controls
                const newSlides = slider.querySelectorAll('.review-slide');
                slideCount = newSlides.length;
                currentSlide = 0;

                const prevBtn = document.getElementById('sliderPrev');
                const nextBtn = document.getElementById('sliderNext');

                if (slideCount <= 1) {
                    if (prevBtn) prevBtn.style.display = 'none';
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (dotsContainer) dotsContainer.style.display = 'none';
                } else {
                    if (prevBtn) prevBtn.style.display = 'flex';
                    if (nextBtn) nextBtn.style.display = 'flex';
                    if (dotsContainer) dotsContainer.style.display = 'flex';

                    newSlides.forEach((_, idx) => {
                        const dot = document.createElement('div');
                        dot.classList.add('dot');
                        if (idx === 0) dot.classList.add('active');
                        dot.addEventListener('click', () => goToSlide(idx));
                        dotsContainer.appendChild(dot);
                    });
                }

                // Update dots list
                dots = document.querySelectorAll('.dot');
                updateSliderUI();
                resetAutoSlide();
            }
        } catch (err) {
            console.warn('Backend reviews API unavailable. Using static fallback reviews.');
        }
    }

    // Fire API requests
    fetchDynamicPackages();
    fetchDynamicGallery();
    fetchDynamicReviews();
    fetchFleetVehicles();
    fetchRentalRates();
});

// Example / default fleet vehicles (empty by default)
const EXAMPLE_FLEET = [];

async function fetchFleetVehicles() {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://wings-backend-jada.onrender.com/api';

    const fleetGrid = document.getElementById('fleetGrid');
    if (!fleetGrid) return;

    try {
        const res = await fetch(`${API_URL}/vehicles`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            renderFleetCards(data.data);
        } else {
            fleetGrid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-car-front" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No vehicles in fleet at the moment.</p></div>';
        }
    } catch (err) {
        console.warn('Fleet API unavailable.');
        fleetGrid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-car-front" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No fleet vehicles available at the moment.</p></div>';
    }
}

function renderFleetCards(vehicles) {
    const fleetGrid = document.getElementById('fleetGrid');
    if (!fleetGrid) return;
    fleetGrid.innerHTML = '';

    vehicles.forEach(v => {
        const card = document.createElement('div');
        card.className = 'fleet-card reveal-slide-up';

        const featuresArr = (v.features || '').split(',').map(f => f.trim()).filter(Boolean);
        const featurePills = featuresArr.map(f =>
            `<span class="fleet-feature-pill"><i class="bi bi-check-circle-fill"></i>${f}</span>`
        ).join('');

        card.innerHTML = `
            <div class="fleet-card-img-wrap">
                <img src="${v.imageUrl}" alt="${v.name}" class="fleet-card-img" loading="lazy">
                <div class="fleet-card-badge">${v.type}</div>
            </div>
            <div class="fleet-card-body">
                <h3 class="fleet-card-name">${v.name}</h3>
                <div class="fleet-card-specs">
                    <div class="fleet-spec-item">
                        <i class="bi bi-people-fill"></i>
                        <span>${v.capacity} Seater</span>
                    </div>
                    <div class="fleet-spec-item">
                        <i class="bi bi-fuel-pump-fill"></i>
                        <span>${v.fuelType}</span>
                    </div>
                    <div class="fleet-spec-item">
                        <i class="bi bi-gear-fill"></i>
                        <span>${v.transmission}</span>
                    </div>
                    <div class="fleet-spec-item">
                        <i class="bi bi-snow2"></i>
                        <span>${v.ac ? 'AC' : 'Non-AC'}</span>
                    </div>
                </div>
                ${featurePills ? `<div class="fleet-feature-pills">${featurePills}</div>` : ''}
                <div class="fleet-card-footer">
                    ${v.pricePerKm ? `<span class="fleet-price"><i class="bi bi-tag-fill"></i> ${v.pricePerKm}</span>` : ''}
                    <a href="#booking" class="btn btn-primary btn-sm fleet-book-btn">Book Now <i class="bi bi-arrow-right"></i></a>
                </div>
            </div>
        `;
        fleetGrid.appendChild(card);
    });

    // Re-run reveal observer on newly added cards
    const newRevealEls = fleetGrid.querySelectorAll('.reveal-slide-up');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    newRevealEls.forEach(el => observer.observe(el));
}

/* ==========================================================================
   CAR RENTAL RATES — Dynamic Loader (homepage shows max 4)
   ========================================================================== */

// Example / default rentals (empty by default)
const EXAMPLE_RENTALS = [];

async function fetchRentalRates() {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://wings-backend-jada.onrender.com/api';

    const grid = document.getElementById('rentalRatesGrid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/rentals`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            renderRentalCards(data.data);
        } else {
            grid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-cash-coin" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No rental rates available at the moment.</p></div>';
        }
    } catch (e) {
        console.warn('Rental rates API unavailable.');
        grid.innerHTML = '<div class="no-data-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><i class="bi bi-cash-coin" style="font-size: 2.5rem; display: block; margin-bottom: 1rem; color: var(--primary);"></i><p>No rental rates available at the moment.</p></div>';
    }
}

function renderRentalCards(vehicles, containerId = 'rentalRatesGrid', limit = 4) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';

    const isHomepage = limit === 4;
    const shown = isHomepage ? vehicles.slice(0, 4) : vehicles;

    shown.forEach(v => {
        const card = document.createElement('div');
        card.className = 'rental-card reveal-slide-up';

        card.innerHTML = `
            <div class="rental-card-img-wrap">
                <img src="${v.imageUrl}" alt="${v.name}" class="rental-card-img" loading="lazy">
                <div class="rental-card-type-badge">${v.type}</div>
                <div class="rental-card-capacity"><i class="bi bi-people-fill"></i> ${v.capacity} Seater</div>
            </div>
            <div class="rental-card-body">
                <h3 class="rental-card-name">${v.name}</h3>
                <div class="rental-rates-grid">
                    ${v.ratePerKm ? `<div class="rental-rate-item"><span class="rental-rate-label"><i class="bi bi-map"></i> Per KM</span><span class="rental-rate-value">${v.ratePerKm}</span></div>` : ''}
                    ${v.ratePerDay ? `<div class="rental-rate-item"><span class="rental-rate-label"><i class="bi bi-calendar3"></i> Per Day</span><span class="rental-rate-value">${v.ratePerDay}</span></div>` : ''}
                    ${v.ratePerHour ? `<div class="rental-rate-item"><span class="rental-rate-label"><i class="bi bi-clock"></i> Per Hour</span><span class="rental-rate-value">${v.ratePerHour}</span></div>` : ''}
                    ${v.minFare ? `<div class="rental-rate-item rental-min-fare"><span class="rental-rate-label"><i class="bi bi-info-circle"></i> Min Fare</span><span class="rental-rate-value">${v.minFare}</span></div>` : ''}
                </div>
                ${v.ac ? '<div class="rental-ac-badge"><i class="bi bi-snow2"></i> Air Conditioned</div>' : ''}
                <a href="tariffs.html" class="btn btn-primary btn-sm rental-book-btn">Rent This Car <i class="bi bi-arrow-right"></i></a>
            </div>
        `;
        grid.appendChild(card);
    });

    // Show "View All" button if more than 4 vehicles
    if (isHomepage && vehicles.length > 4) {
        const wrap = document.getElementById('rentalViewAllWrap');
        if (wrap) wrap.style.display = 'flex';
    }

    // Animate cards in
    const cards = grid.querySelectorAll('.reveal-slide-up');
    const obs = new IntersectionObserver((entries, observer) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('active'); observer.unobserve(e.target); }
        });
    }, { threshold: 0.08 });
    cards.forEach(c => obs.observe(c));
}
