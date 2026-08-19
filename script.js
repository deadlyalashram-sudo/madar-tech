document.getElementById("year").textContent = new Date().getFullYear();

const header = document.querySelector(".site-header");
const menuToggle = document.getElementById("menuToggle");
const quoteForm = document.getElementById("quoteForm");
const wizardSteps = [...quoteForm.querySelectorAll(".wizard-step")];
const progressSteps = [...quoteForm.querySelectorAll("[data-progress]")];
const wizardBack = document.getElementById("wizardBack");
const wizardNext = document.getElementById("wizardNext");
const wizardSubmit = document.getElementById("wizardSubmit");
const stepError = document.getElementById("stepError");
const requestSummary = document.getElementById("requestSummary");
const draftKey = "madarRequestDraft";
const apiBase = String(window.ABDULLAH_TECH_API_BASE || "").replace(/\/$/, "");
const publicBase = String(window.ABDULLAH_TECH_PUBLIC_BASE || window.location.origin).replace(/\/$/, "");
const apiUrl = (path) => `${apiBase}${path}`;
const trackingUrl = `${apiBase}/track`;
let currentStep = 1;

function isEnglish() {
  return document.documentElement.lang === "en";
}

function showStep(step) {
  currentStep = Math.min(3, Math.max(1, step));
  wizardSteps.forEach((item) => item.classList.toggle("active", Number(item.dataset.step) === currentStep));
  progressSteps.forEach((item) => {
    const number = Number(item.dataset.progress);
    item.classList.toggle("active", number === currentStep);
    item.classList.toggle("complete", number < currentStep);
  });
  wizardBack.hidden = currentStep === 1;
  wizardNext.hidden = currentStep === 3;
  wizardSubmit.hidden = currentStep !== 3;
  stepError.textContent = "";
  if (currentStep === 3) updateSummary();
}

function fieldsForStep(step) {
  return [...quoteForm.querySelector(`[data-step="${step}"]`).querySelectorAll("input, select, textarea")];
}

function validateStep(step) {
  const fields = fieldsForStep(step);
  for (const field of fields) {
    field.classList.remove("invalid");
    const value = String(field.value || "").trim();
    const requiredMissing = field.required && !value;
    const tooShort = field.minLength > 0 && value.length < field.minLength;
    if (!field.checkValidity() || requiredMissing || tooShort) {
      field.classList.add("invalid");
      stepError.textContent = isEnglish()
        ? "Complete the highlighted field before continuing."
        : "أكمل الحقل المحدد قبل المتابعة.";
      field.focus();
      return false;
    }
  }
  if (step === 3) {
    const phone = quoteForm.elements.phone.value.replace(/\s|-/g, "");
    if (!/^(?:\+?9665|05)\d{8}$/.test(phone)) {
      quoteForm.elements.phone.classList.add("invalid");
      stepError.textContent = isEnglish()
        ? "Enter a valid Saudi mobile number, such as 05xxxxxxxx."
        : "أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.";
      quoteForm.elements.phone.focus();
      return false;
    }
  }
  return true;
}

function selectedText(name) {
  const field = quoteForm.elements[name];
  return field.selectedOptions?.[0]?.textContent || field.value;
}

function whatsappPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  return digits;
}

function deliveryMessage(ticketCode, english) {
  return english
    ? `Abdullah Tech request ${ticketCode}. Track it at ${trackingUrl}`
    : `رقم طلبك لدى عبدالله التقنية: ${ticketCode}\nمتابعة الطلب: ${trackingUrl}`;
}

function copyText(value) {
  const temporary = document.createElement("textarea");
  temporary.value = value;
  temporary.setAttribute("readonly", "");
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  document.body.appendChild(temporary);
  temporary.select();
  const copied = document.execCommand("copy");
  temporary.remove();
  return copied;
}

function updateSummary() {
  const labels = isEnglish()
    ? [["Service", "service"], ["City", "city"], ["Method", "visitType"], ["Appointment", "visitDay"], ["Time", "timing"], ["Payment", "paymentMethod"]]
    : [["الخدمة", "service"], ["المدينة", "city"], ["طريقة الخدمة", "visitType"], ["الموعد", "visitDay"], ["الفترة", "timing"], ["الدفع", "paymentMethod"]];
  requestSummary.innerHTML = `<h3>${isEnglish() ? "Request summary" : "ملخص طلبك"}</h3>` + labels.map(([label, name]) =>
    `<div><span>${label}</span><strong>${selectedText(name)}</strong></div>`
  ).join("");
}

function saveDraft() {
  const data = Object.fromEntries(new FormData(quoteForm).entries());
  sessionStorage.setItem(draftKey, JSON.stringify(data));
}

function restoreDraft() {
  try {
    const data = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
    Object.entries(data).forEach(([name, value]) => {
      if (quoteForm.elements[name]) quoteForm.elements[name].value = value;
    });
  } catch (_) {
    sessionStorage.removeItem(draftKey);
  }
}

wizardNext.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  saveDraft();
  showStep(currentStep + 1);
});

wizardBack.addEventListener("click", () => showStep(currentStep - 1));
quoteForm.addEventListener("input", (event) => {
  event.target.classList.remove("invalid");
  stepError.textContent = "";
  saveDraft();
  if (currentStep === 3) updateSummary();
});

restoreDraft();
showStep(1);

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
    const form = quoteForm;
    form.elements.visitType.selectedIndex = preset.visitTypeIndex;
    form.elements.details.value = document.documentElement.lang === "en" ? preset.en : preset.ar;
  });
});

quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateStep(3)) return;
  const data = new FormData(form);
  const english = isEnglish();
  const localPhone = String(data.get("phone")).replace(/\s|-/g, "");
  const status = document.getElementById("formStatus");
  if (!/^(?:\+?9665|05)\d{8}$/.test(localPhone)) {
    status.textContent = english
      ? "Enter a valid Saudi mobile number, such as 05xxxxxxxx."
      : "أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.";
    form.elements.phone.focus();
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = english ? "Sending your request..." : "جارٍ إرسال طلبك...";
  fetch(apiUrl("/api/requests"), {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      name: data.get("name"), phone: data.get("phone"),
      customer_type: data.get("customerType"), city: data.get("city"),
      service: data.get("service"), visit_type: data.get("visitType"),
      visit_day: data.get("visitDay"), timing: data.get("timing"),
      details: data.get("details"), payment_method: data.get("paymentMethod"),
    }),
  }).then(async response => {
    if (!response.ok) throw new Error("request_failed");
    const result = await response.json();
    const message = deliveryMessage(result.ticket_code, english);
    const whatsappUrl = `https://wa.me/${whatsappPhone(data.get("phone"))}?text=${encodeURIComponent(message)}`;
    const email = String(data.get("email") || "").trim();
    const emailUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(english ? "Abdullah Tech tracking number" : "رقم طلب عبدالله التقنية")}&body=${encodeURIComponent(message)}`;
    status.innerHTML = `<div class="request-success">
      <span>${english ? "Request received" : "تم استلام طلبك"}</span>
      <strong class="ticket-number" dir="ltr">${result.ticket_code}</strong>
      <p>${english ? "Save the number now so you can track your request later." : "احفظ الرقم الآن حتى تستطيع متابعة طلبك لاحقًا."}</p>
      <div class="delivery-actions">
        <a class="delivery-whatsapp" href="${whatsappUrl}" target="_blank" rel="noopener">${english ? "Save in WhatsApp" : "حفظ في واتساب"}</a>
        ${email ? `<a href="${emailUrl}">${english ? "Send by email" : "إرسال بالبريد"}</a>` : ""}
        <button type="button" class="copy-ticket" data-ticket="${result.ticket_code}">${english ? "Copy number" : "نسخ الرقم"}</button>
        <a href="${trackingUrl}">${english ? "Track request" : "متابعة الطلب"}</a>
      </div>
    </div>`;
    status.querySelector(".copy-ticket").addEventListener("click", (copyEvent) => {
      const copied = copyText(copyEvent.currentTarget.dataset.ticket);
      copyEvent.currentTarget.textContent = copied
        ? (english ? "Copied" : "تم النسخ")
        : (english ? "Copy manually" : "انسخ الرقم يدويًا");
    });
    form.reset();
    sessionStorage.removeItem(draftKey);
    showStep(1);
  }).catch(() => {
    status.textContent = english
      ? "We could not send the request. Please try again."
      : "تعذر إرسال الطلب. حاول مرة أخرى.";
  }).finally(() => { button.disabled = false; });
});
