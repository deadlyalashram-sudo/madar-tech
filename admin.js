const labels = {new:"جديد",contacted:"تم التواصل",scheduled:"مجدول",in_progress:"جاري العمل",completed:"مكتمل",cancelled:"ملغي"};
const loginPanel = document.getElementById("loginPanel");
const workspace = document.getElementById("adminWorkspace");

async function loadRequests() {
  const filter = document.getElementById("statusFilter").value;
  const response = await fetch(`/api/admin/requests${filter ? `?status_filter=${filter}` : ""}`);
  if (response.status === 401) { loginPanel.hidden = false; workspace.hidden = true; return; }
  const requests = await response.json();
  loginPanel.hidden = true; workspace.hidden = false;
  const counts = requests.reduce((all,item)=>({...all,[item.status]:(all[item.status]||0)+1}),{});
  document.getElementById("adminMetrics").innerHTML = `<div><strong>${requests.length}</strong><span>إجمالي المعروض</span></div><div><strong>${counts.new||0}</strong><span>طلبات جديدة</span></div><div><strong>${counts.in_progress||0}</strong><span>جاري العمل</span></div><div><strong>${counts.completed||0}</strong><span>مكتملة</span></div>`;
  document.getElementById("requestList").innerHTML = requests.length ? requests.map(item => `
    <article class="request-card" data-id="${item.id}">
      <div class="request-card-head"><div><strong>${item.ticket_code}</strong><span>${new Date(item.created_at).toLocaleString("ar-SA")}</span></div><span class="status-badge status-${item.status}">${labels[item.status]}</span></div>
      <h2>${item.service}</h2><p>${item.details}</p>
      <dl><div><dt>العميل</dt><dd>${item.name}</dd></div><div><dt>الجوال</dt><dd dir="ltr">${item.phone}</dd></div><div><dt>الموقع</dt><dd>${item.city}</dd></div><div><dt>الموعد</dt><dd>${item.visit_day}، ${item.timing}</dd></div><div><dt>طريقة الخدمة</dt><dd>${item.visit_type}</dd></div><div><dt>نوع العميل</dt><dd>${item.customer_type}</dd></div></dl>
      <div class="request-actions"><select class="request-status">${Object.entries(labels).map(([value,label])=>`<option value="${value}" ${value===item.status?"selected":""}>${label}</option>`).join("")}</select><textarea class="admin-note" placeholder="ملاحظة تظهر للعميل">${item.admin_note||""}</textarea><button class="save-request primary">حفظ التحديث</button></div>
    </article>`).join("") : `<div class="empty-state">لا توجد طلبات في هذه الحالة.</div>`;
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
document.getElementById("refreshRequests").addEventListener("click",loadRequests);
document.getElementById("logoutButton").addEventListener("click",async()=>{await fetch("/api/admin/logout",{method:"POST"});location.reload();});
loadRequests();
