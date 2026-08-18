const labels = {new:"جديد",contacted:"تم التواصل",scheduled:"مجدول",in_progress:"جاري العمل",completed:"مكتمل",cancelled:"ملغي"};
const loginPanel = document.getElementById("loginPanel");
const workspace = document.getElementById("adminWorkspace");
let loadedRequests = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function normalizedPhone(value) {
  return String(value ?? "").replace(/\D/g, "").replace(/^0/, "966");
}

function filteredRequests() {
  const term = document.getElementById("requestSearch").value.trim().toLowerCase();
  if (!term) return loadedRequests;
  return loadedRequests.filter(item => [
    item.ticket_code, item.name, item.phone, item.city, item.service, item.details,
  ].some(value => String(value ?? "").toLowerCase().includes(term)));
}

function renderRequests() {
  const requests = filteredRequests();
  const counts = loadedRequests.reduce((all,item)=>({...all,[item.status]:(all[item.status]||0)+1}),{});
  document.getElementById("adminMetrics").innerHTML = `<div><strong>${loadedRequests.length}</strong><span>إجمالي المعروض</span></div><div><strong>${counts.new||0}</strong><span>طلبات جديدة</span></div><div><strong>${counts.in_progress||0}</strong><span>جاري العمل</span></div><div><strong>${counts.completed||0}</strong><span>مكتملة</span></div>`;
  document.getElementById("requestList").innerHTML = requests.length ? requests.map(item => `
    <article class="request-card" data-id="${Number(item.id)}">
      <div class="request-card-head"><div><strong>${escapeHtml(item.ticket_code)}</strong><span>${new Date(item.created_at).toLocaleString("ar-SA")}</span></div><span class="status-badge status-${escapeHtml(item.status)}">${escapeHtml(labels[item.status] || item.status)}</span></div>
      <h2>${escapeHtml(item.service)}</h2><p>${escapeHtml(item.details)}</p>
      <dl><div><dt>العميل</dt><dd>${escapeHtml(item.name)}</dd></div><div><dt>الجوال</dt><dd dir="ltr">${escapeHtml(item.phone)}</dd></div><div><dt>الموقع</dt><dd>${escapeHtml(item.city)}</dd></div><div><dt>الموعد</dt><dd>${escapeHtml(item.visit_day)}، ${escapeHtml(item.timing)}</dd></div><div><dt>طريقة الخدمة</dt><dd>${escapeHtml(item.visit_type)}</dd></div><div><dt>نوع العميل</dt><dd>${escapeHtml(item.customer_type)}</dd></div></dl>
      <div class="request-contact"><a href="tel:${escapeHtml(item.phone)}">اتصال</a><a href="https://wa.me/${normalizedPhone(item.phone)}?text=${encodeURIComponent(`مرحبًا ${item.name}، بخصوص طلبك ${item.ticket_code} لدى عبدالله التقنية.`)}" target="_blank" rel="noopener">واتساب</a></div>
      <div class="request-actions"><select class="request-status">${Object.entries(labels).map(([value,label])=>`<option value="${value}" ${value===item.status?"selected":""}>${label}</option>`).join("")}</select><textarea class="admin-note" placeholder="ملاحظة تظهر للعميل">${escapeHtml(item.admin_note||"")}</textarea><button class="save-request primary">حفظ التحديث</button></div>
    </article>`).join("") : `<div class="empty-state">لا توجد طلبات مطابقة للبحث أو الفلتر.</div>`;
}

async function loadRequests() {
  const filter = document.getElementById("statusFilter").value;
  const response = await fetch(`/api/admin/requests${filter ? `?status_filter=${filter}` : ""}`);
  if (response.status === 401) { loginPanel.hidden = false; workspace.hidden = true; return; }
  loadedRequests = await response.json();
  loginPanel.hidden = true; workspace.hidden = false;
  renderRequests();
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById("loginButton");
  const statusMessage = document.getElementById("loginStatus");
  const password = new FormData(form).get("password");
  statusMessage.textContent = "";
  button.disabled = true;
  button.textContent = "جارٍ التحقق...";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({password}),
    });
    if (!response.ok) {
      statusMessage.textContent = response.status === 401
        ? "كلمة المرور غير صحيحة. تحقق منها وحاول مرة أخرى."
        : "تعذر تسجيل الدخول الآن. حاول مجددًا بعد قليل.";
      document.getElementById("adminPassword").focus();
      return;
    }
    form.reset();
    await loadRequests();
  } catch {
    statusMessage.textContent = "تعذر الاتصال بالخادم. تحقق من تشغيل الخدمة ثم حاول مجددًا.";
  } finally {
    button.disabled = false;
    button.textContent = "تسجيل الدخول";
  }
});
document.getElementById("adminPassword").addEventListener("input", () => {
  document.getElementById("loginStatus").textContent = "";
});
document.getElementById("requestList").addEventListener("click", async event => {
  const button = event.target.closest(".save-request"); if (!button) return;
  const card = button.closest(".request-card"); button.disabled=true; button.textContent="جارٍ الحفظ...";
  await fetch(`/api/admin/requests/${card.dataset.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:card.querySelector(".request-status").value,admin_note:card.querySelector(".admin-note").value})});
  await loadRequests();
});
document.getElementById("statusFilter").addEventListener("change",loadRequests);
document.getElementById("requestSearch").addEventListener("input",renderRequests);
document.getElementById("exportRequests").addEventListener("click", () => {
  const rows = filteredRequests();
  const columns = ["ticket_code","name","phone","customer_type","city","service","visit_type","visit_day","timing","status","created_at"];
  const csv = [columns.join(","), ...rows.map(item => columns.map(column => `"${String(item[column] ?? "").replaceAll('"','""')}"`).join(","))].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], {type: "text/csv;charset=utf-8"}));
  link.download = `madar-requests-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});
document.getElementById("refreshRequests").addEventListener("click",loadRequests);
document.getElementById("logoutButton").addEventListener("click",async()=>{await fetch("/api/admin/logout",{method:"POST"});location.reload();});
loadRequests();
