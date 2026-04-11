        // Language Switcher
        function switchLang(lang) {
            // Update buttons
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.remove('active');
                if(btn.textContent === lang.toUpperCase()) {
                    btn.classList.add('active');
                }
            });

            // Update all language elements
            document.querySelectorAll('[data-lang]').forEach(el => {
                if(el.dataset.lang === lang) {
                    el.classList.add('active-lang');
                } else {
                    el.classList.remove('active-lang');
                }
            });

            // Update html lang attribute
            document.documentElement.lang = lang;
        }

        // Mobile Menu Toggle
        function toggleMenu() {
            document.getElementById('navLinks').classList.toggle('active');
        }

        // Smooth Scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if(target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    document.getElementById('navLinks').classList.remove('active');
                }
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if(window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.15)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
            }
        });

    // Form submission with PHP
    document.querySelector('.contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
     // Определяем текущий язык
    const currentLang = document.documentElement.lang || 'en';
    
    // Сообщения на 3 языках
    const messages = {
        en: {
            sending: 'Sending...',
            success: '✅ Message sent successfully! We will contact you soon.',
            error: '❌ Error: ',
            connectionError: '❌ Connection error. Please check your internet and try again.'
        },
        ru: {
            sending: 'Отправка...',
            success: '✅ Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.',
            error: '❌ Ошибка: ',
            connectionError: '❌ Ошибка соединения. Проверьте интернет и попробуйте снова.'
        },
        tj: {
            sending: 'Фиристодан...',
            success: '✅ Паём бомуваффақият фиристода шуд! Мо ба наздикӣ бо шумо тамос мегирем.',
            error: '❌ Хатогӣ: ',
            connectionError: '❌ Хатогии пайвастшавӣ. Интернетро тафтиш кунед ва дубора кӯшиш кунед.'
        }
    };
    
    // Выбираем язык (если не найден - английский)
    const lang = messages[currentLang] ? currentLang : 'en';
    const msg = messages[lang];
    
    const btn = this.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${msg.sending}`;
    btn.disabled = true;
    
    // Собираем данные из активных полей
    const activeInputs = this.querySelectorAll('input.active-lang, input:not([data-lang])');
    const activeTextarea = this.querySelector('textarea.active-lang') || this.querySelector('textarea');
    
    const formData = {
        name: activeInputs[0]?.value || '',
        email: this.querySelector('input[type="email"]').value,
        company: activeInputs[1]?.value || '',
        message: activeTextarea?.value || ''
    };
    
    try {
        const response = await fetch('send_mail.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(msg.success);
            this.reset();
        } else {
            alert(msg.error + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert(msg.connectionError);
    }
    
    btn.innerHTML = originalHTML;
    btn.disabled = false;
});
