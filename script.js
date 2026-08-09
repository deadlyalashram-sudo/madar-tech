const BUSINESS = {
  name: "مدار التقنية",
  whatsapp: "966504556501",
};

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

function whatsappUrl(message) {
  if (!BUSINESS.whatsapp) return null;
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}

document.getElementById("heroWhatsapp").addEventListener("click", (event) => {
  const url = whatsappUrl("السلام عليكم، أرغب بالاستفسار عن خدماتكم التقنية.");
  if (!url) return;
  event.preventDefault();
  window.open(url, "_blank", "noopener");
});

document.getElementById("floatingWhatsapp").addEventListener("click", (event) => {
  const english = document.documentElement.lang === "en";
  const message = english
    ? "Hello, I would like to ask about your technical services in Jubail."
    : "السلام عليكم، أرغب بالاستفسار عن خدماتكم التقنية في الجبيل.";
  event.preventDefault();
  window.open(whatsappUrl(message), "_blank", "noopener");
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
  const message = english
    ? [
        "Quote request - Madar Tech",
        `Name: ${data.get("name")}`,
        `Mobile: ${data.get("phone")}`,
        `Customer type: ${data.get("customerType")}`,
        `City: ${data.get("city")}`,
        `Service: ${data.get("service")}`,
        `Service method: ${data.get("visitType")}`,
        `Preferred day: ${data.get("visitDay")}`,
        `Preferred period: ${data.get("timing")}`,
        `Details: ${data.get("details")}`,
      ].join("\n")
    : [
        `طلب عرض سعر - ${BUSINESS.name}`,
        `الاسم: ${data.get("name")}`,
        `الجوال: ${data.get("phone")}`,
        `نوع العميل: ${data.get("customerType")}`,
        `المدينة: ${data.get("city")}`,
        `الخدمة: ${data.get("service")}`,
        `طريقة تقديم الخدمة: ${data.get("visitType")}`,
        `اليوم المناسب: ${data.get("visitDay")}`,
        `الفترة المناسبة: ${data.get("timing")}`,
        `التفاصيل: ${data.get("details")}`,
      ].join("\n");
  const url = whatsappUrl(message);
  if (!url) {
    status.textContent = document.documentElement.lang === "en"
      ? "The website is ready. Add the business WhatsApp number in script.js to enable direct requests."
      : "الموقع جاهز. أضف رقم واتساب العمل في ملف script.js لتفعيل إرسال الطلبات.";
    return;
  }
  status.textContent = document.documentElement.lang === "en"
    ? "Your request is ready. WhatsApp will open now."
    : "تم تجهيز الطلب، سيتم فتح واتساب الآن.";
  window.open(url, "_blank", "noopener");
});
