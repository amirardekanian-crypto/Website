/* «تو کدوم سطحی؟» — the level test on amirardekani.com/tennis/.
   Amir's rules (2026-09-15). Aim: about 70% Level 2, 15% Level 1, 15% Level 3.
   - Level 1 (پایه): under 13, OR tennis under 1 year, OR gym under 6 months AND 2+ of the 3 checks
     not passed ("not sure" counts as not passed).
   - Level 3 (حرفه‌ای): 1+ year of gym AND all 3 checks AND all 4 markers (plyos well, squats more
     than body weight, runs 5 km with no problem, no pain in the last 4 weeks). No numbers: players
     don't have the app, so they don't have numbers.
   - Level 2 (پیشرفته): everyone else. Competition level and tennis days only shape the advice.
   - The doctor question adds a warning on top of any level; it never hides the result.
   Nothing is stored. The only thing sent anywhere is a Plausible event naming the level. */
(function () {
  'use strict';

  var WA = '447435363461';
  var COURSE = 'سیستم آمادگی جسمانی تنیس · سطح ۲';
  var YES = [['yes', 'آره'], ['no', 'نه'], ['unsure', 'مطمئن نیستم']];

  var QUESTIONS = [
    { id: 'age', q: 'چند سالته؟',
      opts: [['u13', 'زیرِ ۱۳ سال'], ['13-15', '۱۳ تا ۱۵ سال'], ['16-17', '۱۶ تا ۱۷ سال'], ['18+', '۱۸ سال و بالاتر']] },
    { id: 'tennis', q: 'چند وقته تنیس بازی می‌کنی؟',
      opts: [['lt1', 'کمتر از ۱ سال'], ['1-3', '۱ تا ۳ سال'], ['3+', 'بیشتر از ۳ سال']] },
    { id: 'days', q: 'هفته‌ای چند روز تنیس داری؟',
      opts: [['1-2', '۱ یا ۲ روز'], ['3', '۳ روز'], ['4+', '۴ روز یا بیشتر']] },
    { id: 'comp', q: 'تو چه سطحی مسابقه میدی؟',
      opts: [['none', 'مسابقه نمیدم'], ['club', 'باشگاهی'], ['prov', 'استانی'], ['nat', 'ملی'], ['intl', 'بین‌المللی']] },
    { id: 'gym', q: 'چند وقته منظم بدنسازی می‌کنی؟',
      hint: 'یعنی هفته‌ای ۲ جلسه یا بیشتر. کلاسِ تنیس و مسابقه حساب نمیشه.',
      opts: [['never', 'اصلاً'], ['lt6', 'کمتر از ۶ ماه'], ['6-12', '۶ تا ۱۲ ماه'], ['1-2', '۱ تا ۲ سال'], ['2+', 'بیشتر از ۲ سال']] },
    { id: 'pushup', q: 'می‌تونی ۱۰ تا شنای درست پشتِ سرِ هم بری؟',
      hint: 'دخترها و خانم‌ها: ۶ تا. بدن از سر تا پا صاف، و بازو تا موازیِ زمین پایین بیاد.', opts: YES },
    { id: 'plank', q: 'می‌تونی ۳۰ ثانیه پلانکِ پهلو بمونی، هر طرف؟',
      hint: 'روی ساعد، بدن صاف از گوش تا مچِ پا، بدونِ افتادنِ لگن.', opts: YES },
    { id: 'calf', q: 'می‌تونی ۲۰ بار روی پنجه‌ی یک پا بالا بری، هر پا؟',
      hint: 'پابرهنه، پای صاف، و دست فقط برای تعادل روی دیوار.', opts: YES },
    // Level 3 markers: shown only while Level 3 is still possible (see l3Possible).
    { id: 'plyo', l3: true, q: 'پلایومتریک رو منظم انجام میدی و فرودهات نرم و ثابته؟',
      hint: 'مثلاً پرشِ جعبه، لی‌لی و پرش‌های پشتِ سرِ هم.', opts: YES },
    { id: 'squat', l3: true, q: 'اسکوات با وزنه‌ای بیشتر از وزنِ بدنت می‌زنی؟',
      hint: 'دست‌کم یه تکرارِ کامل و تمیز، تا موازی.', opts: YES },
    { id: 'run', l3: true, q: '۵ کیلومتر رو یکسره و بدونِ مشکل می‌دوی؟', opts: YES },
    { id: 'pain', l3: true, q: '۴ هفته‌ی اخیر بدونِ درد تمرین کردی؟',
      hint: 'کوفتگیِ عادیِ بعد از تمرین حساب نمیشه.', opts: [['yes', 'آره'], ['no', 'نه']] },
    { id: 'doctor', q: 'یکی از این‌ها درباره‌ت درسته؟',
      list: [
        'موقعِ تمرین یا کمی بعدش، درد یا فشار تو سینه، تپشِ ناگهانیِ قلب، یا غش یا نزدیک به غش داشتی.',
        'پزشک به خاطرِ بیماریِ قلبی یا یه بیماریِ طولانی‌مدت (مثلِ آسم، دیابت یا صرع) زیرِ نظرت داره، یا گفته فقط با نظارتِ پزشک ورزش کنی.',
        'الان آسیب داری، یا دردی که باعثِ لنگیدن میشه، شب بیدارت می‌کنه، ورم می‌کنه یا هفته‌به‌هفته بدتر میشه.',
        '۱۲ ماهِ اخیر جراحی کردی، یا ۶ ماهِ اخیر استخوانت شکسته.',
        '۳ ماهِ اخیر ضربه به سر داشتی، یا هنوز سردرد، سرگیجه یا حالِ بد داری.'
      ],
      opts: [['no', 'نه، هیچ‌کدوم'], ['yes', 'آره، دست‌کم یکی']] }
  ];

  var CHECKS = ['pushup', 'plank', 'calf'];
  var MARKERS = ['plyo', 'squat', 'run', 'pain'];
  var A = {};        // answers, this page view only
  var path = [];     // question ids in the order answered, for Back
  var started = false;
  var root = document.getElementById('lt');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function waLink(text) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text); }

  // Checks answered with anything but "yes". Unanswered checks are not counted yet.
  function missed(a) { return CHECKS.filter(function (k) { return a[k] && a[k] !== 'yes'; }); }
  function gymNew(a) { return a.gym === 'never' || a.gym === 'lt6'; }

  // Level 1 as soon as the answers decide it (also used to skip questions that can't change it).
  function level1Reason(a) {
    if (a.age === 'u13') return 'age';
    if (a.tennis === 'lt1') return 'tennis';
    if (gymNew(a) && missed(a).length >= 2) return 'base';
    return '';
  }
  // Level 3 is still possible: 1+ year of gym, no check missed, no marker answered "no"/"not sure".
  function l3Possible(a) {
    return !level1Reason(a) && (a.gym === '1-2' || a.gym === '2+') && missed(a).length === 0 &&
      MARKERS.every(function (k) { return !a[k] || a[k] === 'yes'; });
  }
  function place(a) {
    var r = level1Reason(a);
    if (r) return { level: 1, reason: r };
    if (l3Possible(a) && MARKERS.every(function (k) { return a[k] === 'yes'; })) return { level: 3 };
    return { level: 2 };
  }

  function wanted(q) {
    if (q.id === 'doctor') return true;
    if (level1Reason(A)) return false;
    return q.l3 ? l3Possible(A) : true;
  }
  function remaining() { return QUESTIONS.filter(function (q) { return !A[q.id] && wanted(q); }); }

  function keepInView() {
    var top = root.getBoundingClientRect().top;
    if (top < 70 || top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + top - 90, behavior: 'smooth' });
  }

  function intro() {
    root.innerHTML = '<div class="lt-intro"><div class="lt-q">۲ دقیقه، و سطحت معلوم میشه.</div>' +
      '<div class="lt-meta"><span>حدودِ ۱۰ سؤال</span><span>بدونِ ثبت‌نام</span><span>هیچ‌چی ذخیره نمیشه</span></div>' +
      '<button class="btn btn-primary" type="button" data-start>شروع کن</button></div>';
  }

  function ask(q) {
    var left = remaining().length;
    var pct = Math.round(100 * path.length / (path.length + left));
    var h = '<div class="lt-bar" aria-hidden="true"><div class="lt-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="lt-q" tabindex="-1">' + esc(q.q) + '</div>';
    if (q.hint) h += '<div class="lt-hint">' + esc(q.hint) + '</div>';
    if (q.list) h += '<ul class="lt-list">' + q.list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    h += '<div class="lt-opts">' + q.opts.map(function (o) {
      return '<button type="button" class="lt-opt" data-q="' + q.id + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
    h += '<div class="lt-foot">' + (path.length ? '<button type="button" class="lt-link" data-back>→ قبلی</button>' : '<span></span>') + '</div>';
    root.innerHTML = h;
    if (started) { keepInView(); root.querySelector('.lt-q').focus({ preventScroll: true }); }
  }

  function step() {
    var q = remaining()[0];
    if (q) ask(q); else showResult(place(A));
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-start')) { started = true; step(); return; }
    if (b.hasAttribute('data-back')) { delete A[path.pop()]; step(); return; }
    if (b.hasAttribute('data-again')) { A = {}; path = []; step(); return; }
    var id = b.getAttribute('data-q');
    if (!id || A[id]) return;
    A[id] = b.getAttribute('data-v');
    path.push(id);
    b.classList.add('sel');
    setTimeout(step, 160);
  });

  var FA_NUM = ['', '۱', '۲', '۳'];
  var NAMES = { 1: 'پایه', 2: 'پیشرفته', 3: 'حرفه‌ای' };
  var CHECK_NAMES = { pushup: '۱۰ شنا (یا ۶)', plank: '۳۰ ثانیه پلانکِ پهلو', calf: '۲۰ بار روی پنجه‌ی یک پا' };
  var DAYS_NOTE = {
    '1-2': '۱ یا ۲ روز تنیس در هفته داری، پس می‌تونی تا ۳ جلسه‌ی اضافه برداری.',
    '3': '۳ روز تنیس در هفته داری، پس تا ۲ جلسه‌ی اضافه بردار.',
    '4+': '۴ روز یا بیشتر تنیس داری، پس فقط ۱ جلسه‌ی اضافه بردار.'
  };

  function note(text, warn) { return '<div class="lt-note' + (warn ? ' lt-warn' : '') + '">' + text + '</div>'; }

  function showResult(p) {
    var lv = p.level;
    var h = '<div class="lt-res-top"><div class="lt-badge' + (lv === 2 ? '' : ' soon') + '">' + FA_NUM[lv] + '</div>' +
      '<div><div class="lt-kick">نتیجه‌ی تو</div><div class="lt-title" tabindex="-1">سطح ' + FA_NUM[lv] + ' · ' + NAMES[lv] + '</div></div></div>';

    if (A.doctor === 'yes') {
      h += note('⚠️ <b>قبل از تمرینِ سخت، اول پزشک.</b> گفتی یکی از موردهای پزشکی درباره‌ت درسته (برای آسیب: پزشک یا فیزیوتراپ). ' +
        'این تشخیص نیست؛ فقط یعنی پزشک باید قبلش بررسی کنه. ازش بپرس: «می‌تونم تمرینِ ورزشیِ کامل و بدونِ محدودیت انجام بدم، شاملِ دوی سرعت، پرش و وزنه؟»', true);
    }

    if (lv === 1) {
      var why = {
        age: 'سطحِ پیشرفته برای ۱۳ سال و بالاتر نوشته شده.',
        tennis: 'کمتر از یه ساله تنیس بازی می‌کنی؛ سطحِ پایه دقیقاً برای همین مرحله‌ست.',
        base: 'تازه بدنسازی رو شروع کردی و ' + missed(A).map(function (k) { return CHECK_NAMES[k]; }).join(' و ') + ' هنوز راحت نیست.'
      }[p.reason];
      h += '<ul class="lt-why"><li>' + why + '</li></ul>';
      if (p.reason === 'base') h += note('همین حرکت‌ها رو هفته‌ای ۲ تا ۳ بار تمرین کن و ۴ تا ۶ هفته بعد دوباره تست بده.');
      h += '<p class="lt-p">سطح ۱ · پایه به‌زودی میاد. تا اون موقع، اگه می‌خوای همین حالا شروع کنی، برنامه‌ی اختصاصی از همون جایی که هستی شروع می‌کنه.</p>' +
        '<div class="lt-cta"><a class="btn btn-primary" href="/form-fa.html">برنامه‌ی اختصاصی ←</a>' +
        '<a class="btn btn-ghost dark" href="/index-fa.html#pricing">قیمت و جزئیات</a></div>';
    } else if (lv === 3) {
      h += '<p class="lt-p">تو بازیکنِ ورزیده‌ای: سابقه‌ی تمرین، پلایومتریک، قدرت و استقامت، همه‌ش هست.</p>' +
        '<p class="lt-p">سطح ۳ · حرفه‌ای به‌زودی میاد. تا اون موقع، برنامه‌ی اختصاصی بهترین قدمه: از همین سطحی که هستی جلو میره.</p>' +
        '<div class="lt-cta"><a class="btn btn-primary" href="/form-fa.html">برنامه‌ی اختصاصی ←</a>' +
        '<a class="btn btn-ghost dark" href="/index-fa.html#pricing">قیمت و جزئیات</a></div>';
    } else {
      h += '<p class="lt-p">سطحِ پیشرفته دقیقاً برای توست: برنامه‌ی ۱۶ هفته‌ای که تو زمین سریع‌تر، قوی‌تر و انفجاری‌ترت می‌کنه.</p>';
      if (gymNew(A)) h += note('تازه‌کاری تو باشگاه؟ هر جا شک داشتی، وزنه‌ی سبک‌تر رو بردار.');
      if (A.age === '13-15') h += note('۱۳ تا ۱۵ سال: نسخه‌ی نوجوانان داخلِ برنامه‌ست، و هر جلسه یه بزرگسال باید حاضر باشه.');
      if (DAYS_NOTE[A.days]) h += note(DAYS_NOTE[A.days]);
      if (A.comp === 'prov' || A.comp === 'nat' || A.comp === 'intl') {
        h += note('مسابقه‌ی جدی داری؟ درسِ «تمرین کنار تنیس و مسابقه» می‌گه هفته‌ی تورنمنت چی‌کار کنی.');
      }
      h += '<div class="lt-cta"><a class="btn btn-primary" target="_blank" rel="noopener" href="' +
        esc(waLink('سلام امیر، تستِ «تو کدوم سطحی؟» رو دادم و سطح ۲ · پیشرفته شدم. می‌خوام «' + COURSE + '» رو بخرم.')) +
        '">خرید از واتساپ 💬</a><a class="btn btn-ghost dark" href="#inside">داخلش چیه؟</a></div>' +
        '<div class="lt-price">یه‌بار پرداخت · معادلِ ۱۷ دلار، به تومان</div>';
    }

    h += '<div class="lt-foot"><button type="button" class="lt-link" data-back>→ قبلی</button>' +
      '<button type="button" class="lt-link" data-again>دوباره از اول ↺</button></div>';
    root.innerHTML = h;
    keepInView();
    root.querySelector('.lt-title').focus({ preventScroll: true });
    try { window.plausible('Level test ' + lv); } catch (e) { /* stats are optional */ }
  }

  // Every other buy button on the page opens WhatsApp with the message already typed.
  Array.prototype.forEach.call(document.querySelectorAll('.js-buy'), function (a) {
    a.href = waLink('سلام امیر، می‌خوام «' + COURSE + '» رو بخرم.');
  });

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visible'); io.unobserve(x.target); } });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(document.querySelectorAll('.sec-h,.sec-sub,.rung,.feat,.step,.price-card,.faq details,.author'), function (n) {
      n.classList.add('reveal'); io.observe(n);
    });
  }

  window.LevelTest = { place: place, questions: QUESTIONS };  // for checking the rules in a console
  intro();
})();
