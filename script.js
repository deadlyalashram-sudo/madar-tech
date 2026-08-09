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

document.getElementById("quoteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const english = document.documentElement.lang === "en";
  const message = english
    ? [
        "Quote request - Madar Tech",
        `Name: ${data.get("name")}`,
        `Mobile: ${data.get("phone")}`,
        `Customer type: ${data.get("customerType")}`,
        `City: ${data.get("city")}`,
        `Service: ${data.get("service")}`,
        `Preferred time: ${data.get("timing")}`,
        `Details: ${data.get("details")}`,
      ].join("\n")
    : [
        `طلب عرض سعر - ${BUSINESS.name}`,
        `الاسم: ${data.get("name")}`,
        `الجوال: ${data.get("phone")}`,
        `نوع العميل: ${data.get("customerType")}`,
        `المدينة: ${data.get("city")}`,
        `الخدمة: ${data.get("service")}`,
        `الموعد المناسب: ${data.get("timing")}`,
        `التفاصيل: ${data.get("details")}`,
      ].join("\n");
  const url = whatsappUrl(message);
  const status = document.getElementById("formStatus");
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
