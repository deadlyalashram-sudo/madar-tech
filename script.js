document.getElementById("year").textContent = new Date().getFullYear();

const header = document.querySelector(".site-header");
const menuToggle = document.getElementById("menuToggle");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 24);
});

menuToggle.addEventListener("click", () => {
  const open = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.textContent = open ? "×" : "☰";
});

document.querySelectorAll(".site-header nav a").forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

const requestPresets = {
  visit: {
    visitTypeIndex: 1,
    ar: "أرغب في طلب زيارة للفحص والتشخيص.",
    en: "I would like to request an on-site inspection and diagnosis.",
  },
  setup: {
    visitTypeIndex: 1,
    ar: "أرغب في معاينة وتجهيز تقني متكامل.",
    en: "I would like an inspection and complete technical setup.",
  },
  support: {
    visitTypeIndex: 4,
    ar: "أرغب في مناقشة خطة دعم تقني دوري للمنشأة.",
    en: "I would like to discuss a recurring technical support plan.",
  },
};

document.querySelectorAll("[data-request-type]").forEach((link) => {
  link.addEventListener("click", () => {
    const preset = requestPresets[link.dataset.requestType];
    if (!preset) return;
    const form = document.getElementById("quoteForm");
    form.elements.visitType.selectedIndex = preset.visitTypeIndex;
    form.elements.details.value = document.documentElement.lang === "en" ? preset.en : preset.ar;
  });
});

document.getElementById("quoteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const english = document.documentElement.lang === "en";
  const localPhone = String(data.get("phone")).replace(/\s|-/g, "");
  const status = document.getElementById("formStatus");
  if (!/^(?:\+?9665|05)\d{8}$/.test(localPhone)) {
    status.textContent = english
      ? "Enter a valid Saudi mobile number, such as 05xxxxxxxx."
      : "أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.";
    event.currentTarget.elements.phone.focus();
    return;
  }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = english ? "Sending your request..." : "جارٍ إرسال طلبك...";
  fetch("/api/requests", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: data.get("name"), phone: data.get("phone"),
      customer_type: data.get("customerType"), city: data.get("city"),
      service: data.get("service"), visit_type: data.get("visitType"),
      visit_day: data.get("visitDay"), timing: data.get("timing"),
      details: data.get("details"),
    }),
  }).then(async response => {
    if (!response.ok) throw new Error("request_failed");
    const result = await response.json();
    status.innerHTML = english
      ? `Request received. Your tracking number is <strong dir="ltr">${result.ticket_code}</strong>. <a href="/track">Track request</a>`
      : `تم استلام طلبك. رقم المتابعة <strong dir="ltr">${result.ticket_code}</strong>. <a href="/track">متابعة الطلب</a>`;
    event.currentTarget.reset();
  }).catch(() => {
    status.textContent = english
      ? "We could not send the request. Please try again."
      : "تعذر إرسال الطلب. حاول مرة أخرى.";
  }).finally(() => { button.disabled = false; });
});
