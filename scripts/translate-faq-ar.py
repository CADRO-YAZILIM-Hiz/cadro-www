#!/usr/bin/env python3
"""Replace Turkish FAQ content with Arabic in ar/faq.html"""
import re

AR_FAQ = '''<main data-i18n-html="true" data-i18n-key="page_faq_main">
<section class="hero reveal-on-scroll is-visible" style="padding-top: 80px; padding-bottom: 40px; text-align: center;">
<div class="hero-copy" style="max-width: 800px; margin: 0 auto;">
<p class="eyebrow">مركز المساعدة</p>
<h1 style="font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 20px;">الأسئلة <br><span style="color: var(--cyan);">الشائعة</span></h1>
<p class="hero-text" style="font-size: 1.1rem; max-width: 600px; color: #475569;">كل ما تريد معرفته عن برنامج الموارد البشرية CADRO. ابحث أو تصفح الفئات.</p>
</div>
<input class="faq-search" id="faqSearch" placeholder="ابحث عن سؤالك..." type="text">
</section>
<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 40px 20px;">
<div class="faq-grid">
<div class="faq-quick-link" onclick="scrollToCategory('pricing')">
<h4>💰 الأسعار</h4>
<p>الخطط وخيارات الدفع</p>
</div>
<div class="faq-quick-link" onclick="scrollToCategory('features')">
<h4>⚡ الميزات</h4>
<p>الوحدات والوظائف</p>
</div>
<div class="faq-quick-link" onclick="scrollToCategory('technical')">
<h4>🔧 تقني</h4>
<p>الإعداد والتكامل</p>
</div>
<div class="faq-quick-link" onclick="scrollToCategory('security')">
<h4>🔒 الأمان</h4>
<p>حماية البيانات والامتثال</p>
</div>
<div class="faq-quick-link" onclick="scrollToCategory('support')">
<h4>🎯 الدعم</h4>
<p>التدريب والمساعدة</p>
</div>
<div class="faq-quick-link" onclick="scrollToCategory('comparison')">
<h4>📊 المقارنة</h4>
<p>المنافسون وExcel</p>
</div>
</div>
</section>
<section class="section reveal-on-scroll" style="padding: 60px 20px;">
<div class="faq-container">
<div class="faq-category" id="pricing">
<h2 class="faq-category-title">💰 الأسعار والدفع</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هو سعر CADRO؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
يُقدَّم CADRO بـ 3 خطط: <strong>Basic ($99/شهرياً)</strong>، <strong>Pro ($249/شهرياً)</strong> و<strong>Enterprise ($699/شهرياً)</strong>. خصومات على الاشتراك السنوي. الدعم الفني والتحديثات مشمولة في جميع الخطط.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل توجد فترة تجريبية مجانية؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، نوفر فترة تجريبية مجانية لمدة 14 يوماً. لا حاجة لبطاقة ائتمان، يمكنك اختبار جميع الميزات. لن يتم التحويل تلقائياً إلى خطة مدفوعة بعد انتهاء الفترة التجريبية.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هي طرق الدفع المتاحة؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نقبل بطاقات الائتمان والتحويل البنكي. خيار الفاتورة المؤسسية متاح أيضاً. جميع المدفوعات محمية بتشفير SSL.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هي سياسة الإلغاء؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
يمكنك إلغاء اشتراكك في أي وقت. عند الإلغاء تستمر بالاستخدام حتى نهاية الشهر ولن يتم خصم رسوم الدورة التالية. لا توجد استردادات للأشهر غير المستخدمة في الاشتراكات السنوية.
</div></div></div>
</div>
<div class="faq-category" id="features">
<h2 class="faq-category-title">⚡ الميزات والوحدات</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هي وحدات الموارد البشرية المتاحة؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
يقدم CADRO 6 وحدات رئيسية: <strong>ATS (التوظيف)</strong>، <strong>إدارة الأداء (OKR)</strong>، <strong>الملف الوظيفي الرقمي</strong>، <strong>إدارة الإجازات</strong>، <strong>الحضور والورديات</strong>، <strong>المصاريف والمشتريات</strong>.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يمكنني استيراد البيانات من Excel؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، لدينا أدوات استيراد متقدمة من Excel. يمكنك نقل قوائم الموظفين وأرصدة الإجازات وهيكل الأقسام في دقائق. ندعم صيغ CSV وXLSX.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يوجد تطبيق للهاتف؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نظامنا المبني على الويب متوافق مع الأجهزة المحمولة. يمكن استخدامه بكامل وظائفه من أجهزة iOS وAndroid. كما سيتم إطلاق تطبيقنا الخاص في الربع الثاني من 2026.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يمكن تخصيص النظام؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، في خطة Enterprise يمكنك إنشاء حقول مخصصة وسير عمل وتقارير. تتوفر خيارات التكامل عبر API ومسارات الموافقة المخصصة وتكييف الهوية المؤسسية.
</div></div></div>
</div>
<div class="faq-category" id="technical">
<h2 class="faq-category-title">🔧 الإعداد التقني والتكامل</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>كم يستغرق الإعداد؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
لا حاجة لأي تثبيت في نظامنا السحابي. يمكنك التسجيل والبدء في 5 دقائق. مع نقل البيانات والتدريب، تصبح جاهزاً للعمل بالكامل خلال <strong>1-2 ساعة</strong>.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هي الأنظمة التي تتكامل معها؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نتكامل مع أنظمة ERP مثل <strong>SAP وNetsis وMikro</strong>، أدوات المكتب مثل <strong>Google Workspace وMicrosoft 365</strong>، ومنصات التواصل مثل <strong>Slack وTeams</strong>.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يتوفر وصول عبر API؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، لدينا RESTful API. يمكنك الوصول البرمجي لجميع الوحدات. التوثيق المفصل متاح.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>كيف يتم النسخ الاحتياطي للبيانات؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نجري نسخاً احتياطياً يومياً تلقائياً. تُحفظ بياناتك في مواقع جغرافية مختلفة. يمكنك تصدير بياناتك في أي وقت بصيغ JSON أو CSV أو PDF.
</div></div></div>
</div>
<div class="faq-category" id="security">
<h2 class="faq-category-title">🔒 الأمان والامتثال</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل بياناتي آمنة؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
بالتأكيد. نمتلك شهادات <strong>SSL 256-bit</strong> و<strong>ISO 27001</strong> و<strong>SOC 2 Type II</strong>. تُحفظ بياناتك وتُنسخ احتياطياً في مراكز بيانات آمنة.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل النظام متوافق مع KVKK/GDPR؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، متوافقون تماماً. يتوفر جرد معالجة البيانات وإدارة الموافقات وفترات الاحتفاظ وإجراءات الحذف. نقدم تقارير ودعم تدقيق.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>كيف تعمل الصلاحيات؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نظام صلاحيات قائم على الأدوار. يمكنك إنشاء أدوار مختلفة مثل مدير الموارد البشرية ورئيس القسم والموظف. كل مستخدم يصل فقط إلى البيانات المتعلقة بمهامه.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يوجد حق حذف البيانات؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، يمكننا حذف بيانات الموظفين عند الطلب وفقاً لـ "حق النسيان". عملية الحذف نهائية وتشمل جميع الأنظمة بما فيها النسخ الاحتياطية.
</div></div></div>
</div>
<div class="faq-category" id="support">
<h2 class="faq-category-title">🎯 التدريب والدعم</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل توفرون دعم تدريبي؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
نعم، نقدم <strong>تدريب إعداد مجاني</strong>. تتوفر مقاطع فيديو تعليمية وندوات عبر الإنترنت وأدلة استخدام. في خطة Enterprise نقدم أيضاً جلسات تدريب مخصصة.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>كيف يعمل الدعم الفني؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
دعم فني متاح على مدار الساعة. نقدم الدردشة المباشرة والبريد الإلكتروني (info@cadro.io) والدعم الهاتفي. الدعم ذو الأولوية متاح في خطتي Pro وEnterprise.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>هل يوجد دليل استخدام؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
يتوفر <strong>مركز مساعدة شامل عبر الإنترنت</strong>. أدلة خطوة بخطوة ومقاطع فيديو تعليمية يتم تحديثها باستمرار. نقدم أدلة استخدام خاصة بكل وحدة.
</div></div></div>
</div>
<div class="faq-category" id="comparison">
<h2 class="faq-category-title">📊 المقارنة والمنافسون</h2>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما الفرق عن Excel؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
بينما Excel أداة يدوية، فإن CADRO منصة <strong>آلية ومتكاملة</strong>. في Excel مخاطر الأخطاء مرتفعة وأمان البيانات ضعيف والتعاون محدود. في CADRO دقة 95% وحسابات تلقائية وتقارير فورية.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما الذي يميزكم عن المنافسين؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
ميزتنا الكبرى أننا <strong>حل سحابي عالمي</strong> مع توافق كامل ودعم سريع وتكامل مرن. كما أننا الحل الوحيد الذي يجمع 6 وحدات في منصة واحدة.
</div></div></div>
<div class="faq-item">
<div class="faq-question" onclick="toggleFAQ(this)">
<span>ما هي مدة العائد على الاستثمار (ROI)؟</span>
<svg class="faq-icon" fill="currentColor" viewBox="0 0 20 20"><path clip-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" fill-rule="evenodd"></path></svg>
</div>
<div class="faq-answer"><div class="faq-answer-content">
يحقق عملاؤنا عائداً على الاستثمار في المتوسط خلال <strong>2-3 أسابيع</strong>. من خلال توفير الوقت وتقليل الأخطاء وزيادة الكفاءة ستبدأ بالاستفادة من الشهر الأول.
</div></div></div>
</div>
</div>
</section>
<section class="section final-cta reveal-on-scroll">
<div class="contact-card" style="text-align: center;">
<div>
<p class="eyebrow">لم تجد إجابتك؟</p>
<h2>دع خبراءنا يساعدونك</h2>
<p>إذا لم تجد إجابة سؤالك أو كانت لديك احتياجات خاصة، يسعد فريق خبراء الموارد البشرية لدينا بمساعدتك.</p>
</div>
<div class="contact-actions" style="justify-content: center;">
<a class="primary-button" href="mailto:info@cadro.io">طلب الدعم</a>
<a class="ghost-button" href="https://linkedin.com/company/cadro-io" target="_blank" rel="noopener noreferrer">LinkedIn</a>
<a class="ghost-button" href="https://wa.me/905428842106?text=Hello%20CADRO%2C%20I%20have%20a%20question%20about%20CADRO." target="_blank" rel="noopener noreferrer">WhatsApp</a>
</div>
</div>
</section>
</main>'''

with open('ar/faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<main data-i18n-html="true" data-i18n-key="page_faq_main">.*?</main>'
new_content = re.sub(pattern, AR_FAQ, content, flags=re.DOTALL)

with open('ar/faq.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('FAQ replaced successfully')
