const BASE_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
let products = [], cart = [], quantity = 1, editingStock = null, editingOrder = null;

setInterval(() => {
  document.getElementById("datetime").innerText =
    '🕒 ' + new Date().toLocaleString("th-TH", { dateStyle:"full", timeStyle:"short" });
}, 1000);

window.onload = () => {
  fetchStock(); loadOrders(); loadProducts();
};

function loadProducts() {
  fetch(`${BASE_URL}?action=getStock`).then(r=>r.json()).then(d=>{
    products = d;
    const sel = document.getElementById("productSelect"); sel.innerHTML="";
    d.forEach(p=>{
      const o = document.createElement("option"); o.value=p[0]; o.textContent=p[0];
      sel.appendChild(o);
    });
  });
}

function increaseQty(){ quantity++; document.getElementById("quantity").textContent = quantity; }
function decreaseQty(){ if(quantity>1){ quantity--; document.getElementById("quantity").textContent=quantity; }}

function addProduct(){
  const name = document.getElementById("productSelect").value;
  const prod = products.find(p=>p[0]===name);
  if(!prod) return;
  const exist = cart.find(p=>p.name===name);
  if(exist) exist.qty += quantity;
  else cart.push({name, price: parseFloat(prod[1]), qty: quantity});
  quantity = 1; document.getElementById("quantity").textContent=1;
  renderCart();
}

function renderCart(){
  let ul = document.getElementById("orderList"); ul.innerHTML=""; let total=0;
  cart.forEach((i, idx)=>{
    const sub = i.price * i.qty; total+=sub;
    const li = document.createElement("li");
    li.innerHTML = `🛍️ ${i.name} × ${i.qty} = <strong>${sub}</strong> บาท
      <button onclick="removeItem(${idx})" class="ml-2 text-red-500">❌</button>`;
    ul.appendChild(li);
  });
  document.getElementById("totalPrice").textContent = total;
}

function removeItem(idx){ cart.splice(idx,1); renderCart(); }

function submitOrder(){
  const name = document.getElementById("customerName").value.trim();
  const payment = document.getElementById("paymentStatus").value;
  const note = document.getElementById("note").value.trim();
  if(!name || cart.length===0){
    return Swal.fire("⚠️","กรุณาใส่ชื่อลูกค้าและเลือกสินค้า","warning");
  }
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const payload = editingOrder !== null ?
    {action:"updateOrder", index:editingOrder, order:{name,items:cart,total,payment,note}} :
    {action:"addOrder", order:{name,items:cart,total,payment,note}};
  fetch(BASE_URL,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).then(r=>r.text()).then(_=>{
    Swal.fire("สำเร็จ","บันทึกออเดอร์เรียบร้อย","success");
    editingOrder=null;
    document.getElementById("customerName").value=""; document.getElementById("note").value="";
    cart=[]; renderCart();
    loadOrders(); fetchStock();
  });
}

function loadOrders(){
  fetch(BASE_URL+"?action=getOrders").then(r=>r.json()).then(data=>{
    const ul = document.getElementById("orderHistory"); ul.innerHTML=""; let total=0;
    data.forEach((row,i)=>{
      total += parseFloat(row[3]);
      const items = JSON.parse(row[2]).map(p=>`${p.name} × ${p.qty}`).join(", ");
      const li = document.createElement("li");
      li.className = "bg-purple-100 p-3 rounded-md";
      li.innerHTML = `
        👤 ${row[1]}<br>
        🛍️ ${items}<br>
        💸 ราคารวม: <strong>${row[3]}</strong> บาท<br>
        📌 สถานะ: ${(row[4]==="จ่ายแล้ว")?"✅":"⏳"}<br>
        📝 ${row[5]||""}
        <br>
        <button onclick="confirmDeleteOrder(${i})" class="ml-2 text-red-500">🗑️</button>
        <button onclick="editOrder(${i})" class="ml-2 text-blue-500">✏️</button>`;
      ul.appendChild(li);
    });
    document.getElementById("totalHistory").textContent = total.toFixed(2);

    // Dashboard
    document.getElementById("dashboardTotal").textContent = total.toFixed(2);
    document.getElementById("dashboardCount").textContent = data.length;
    document.getElementById("dashboardAvg").textContent =
      (data.length ? (total/data.length).toFixed(2) : "0");
  });
}

function searchOrders(){
  const kw = document.getElementById("searchName").value.toLowerCase();
  document.querySelectorAll("#orderHistory li").forEach(li=>{
    li.style.display = li.innerText.toLowerCase().includes(kw)? "block":"none";
  });
}

function confirmDeleteOrder(i){
  Swal.fire({
    title:"❗ ลบออเดอร์?",
    text:"คุณแน่ใจหรือไม่?",
    icon:"warning",
    showCancelButton:true,
    confirmButtonText:"ใช่, ลบเลย",
    cancelButtonText:"ยกเลิก"
  }).then(res=>{
    if(res.isConfirmed) deleteOrder(i);
  });
}

function deleteOrder(i){
  fetch(BASE_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({action:"deleteOrder", index:i})
  }).then(_=>{
    Swal.fire("ลบแล้ว","ออเดอร์ถูกลบเรียบร้อย","success");
    loadOrders(); fetchStock();
  });
}

function editOrder(i){
  fetch(BASE_URL+"?action=getOrders").then(r=>r.json()).then(data=>{
    const row = data[i];
    editingOrder = i;
    document.getElementById("customerName").value = row[1];
    document.getElementById("note").value = row[5];
    cart = JSON.parse(row[2]);
    renderCart();
    document.getElementById("paymentStatus").value = row[4];
    showPage("main-page");
  });
}

function fetchStock(){
  fetch(BASE_URL+"?action=getStock").then(r=>r.json()).then(d=>{
    products = d;
    const ul = document.getElementById("stockList"); ul.innerHTML="";
    d.forEach((item,i)=>{
      const [name,price,qty] = item;
      const li = document.createElement("li");
      li.className = qty<=5?"p-3 rounded bg-red-100":"p-3 rounded bg-gray-100";
      li.innerHTML = `📦 ${name} - 💰 ${price} บาท | คงเหลือ: ${qty} ${qty<=5?"⚠️":""}`;
      li.innerHTML += `
        <button onclick="confirmDeleteStock(${i})" class="ml-2 text-red-500">🗑️</button>
        <button onclick="showStockForm(${i})" class="ml-2 text-blue-500">✏️</button>`;
      ul.appendChild(li);
    });
  });
}

function showStockForm(i=null){
  editingStock = i;
  document.getElementById("stockFormTitle").textContent = i===null?"➕ เพิ่มสินค้า":"✏️ แก้ไขสินค้า";
  if(i!==null){
    const [n,p,q] = products[i];
    document.getElementById("stockName").value = n;
    document.getElementById("stockPrice").value = p;
    document.getElementById("stockQty").value = q;
  } else {
    document.getElementById("stockName").value = "";
    document.getElementById("stockPrice").value = "";
    document.getElementById("stockQty").value = "";
  }
  document.getElementById("stockForm").classList.remove("hidden");
}

function hideStockForm(){
  editingStock = null;
  document.getElementById("stockForm").classList.add("hidden");
}

function saveStock(){
  const name = document.getElementById("stockName").value.trim();
  const price = parseFloat(document.getElementById("stockPrice").value);
  const qty = parseInt(document.getElementById("stockQty").value);
  if(!name || isNaN(price)||isNaN(qty)){
    return Swal.fire("⚠️","กรอกข้อมูลสินค้าให้ครบ","warning");
  }
  const payload = editingStock !== null ?
    {action:"updateStock", index:editingStock, product:{name,price,qty}} :
    {action:"addStock", product:{name,price,qty}};

  fetch(BASE_URL,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).then(_=>{
    Swal.fire("สำเร็จ", editingStock!==null?"แก้ไขสินค้าแล้ว":"เพิ่มสินค้าเรียบร
