const TENANTS_KEY="quittance_app_tenants_v1",SETTINGS_KEY="quittance_app_settings_v1";
const state={tenants:[],editing:null,jsonHandle:null,settings:{ownerName:"Votre Nom",ownerAddress:"Votre Adresse",signatureDataUrl:""}};
const months=["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
const $=id=>document.getElementById(id);
const e={form:$("tenant-form"),id:$("tenant-id"),name:$("tenant-name"),address:$("tenant-address"),rent:$("tenant-rent"),charges:$("tenant-charges"),submit:$("btn-tenant-submit"),cancel:$("btn-tenant-cancel"),table:$("tenant-table-body"),ownerName:$("owner-name"),ownerAddress:$("owner-address"),signature:$("owner-signature-file"),preview:$("owner-signature-preview"),remove:$("btn-remove-signature"),open:$("btn-open-json"),save:$("btn-save-json"),saveHandle:$("btn-save-json-handle"),json:$("json-file-input"),all:$("btn-generate-all-current-month"),select:$("generate-tenant-select"),one:$("btn-generate-one-current-month")};
init();

function init(){loadSettings();loadTenants();hydrate();events();render();}
function events(){
 e.form.addEventListener("submit",saveTenant);e.cancel.addEventListener("click",resetForm);
 e.ownerName.addEventListener("input",saveSettings);e.ownerAddress.addEventListener("input",saveSettings);
 e.signature.addEventListener("change",readSignature);e.remove.addEventListener("click",removeSignature);
 e.open.addEventListener("click",openJson);e.save.addEventListener("click",downloadJson);e.saveHandle.addEventListener("click",saveOpenedJson);e.json.addEventListener("change",importJson);
 e.all.addEventListener("click",generateAll);e.one.addEventListener("click",generateOne);
}
function loadSettings(){try{const x=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"null");if(x)state.settings={...state.settings,...x};if(!validImage(state.settings.signatureDataUrl))state.settings.signatureDataUrl=""}catch{}}
function saveSettings(){state.settings.ownerName=e.ownerName.value.trim()||"Votre Nom";state.settings.ownerAddress=e.ownerAddress.value.trim()||"Votre Adresse";localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings))}
function hydrate(){e.ownerName.value=state.settings.ownerName;e.ownerAddress.value=state.settings.ownerAddress;renderSignature()}
function readSignature(ev){const f=ev.target.files&&ev.target.files[0];if(!f)return;if(!f.type.startsWith("image/")){alert("Veuillez choisir une image valide pour la signature.");ev.target.value="";return}const r=new FileReader();r.onload=()=>{const d=String(r.result||"");if(!validImage(d)){alert("Format de signature non supporte.");return}state.settings.signatureDataUrl=d;localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings));renderSignature();ev.target.value=""};r.readAsDataURL(f)}
function renderSignature(){if(!state.settings.signatureDataUrl){e.preview.classList.add("hidden");e.preview.removeAttribute("src");return}e.preview.src=state.settings.signatureDataUrl;e.preview.classList.remove("hidden")}
function removeSignature(){state.settings.signatureDataUrl="";localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings));renderSignature();e.signature.value=""}
function loadTenants(){try{state.tenants=normalize(JSON.parse(localStorage.getItem(TENANTS_KEY)||"[]"))}catch{state.tenants=[]}}
function persist(){localStorage.setItem(TENANTS_KEY,JSON.stringify(state.tenants,null,2))}
function normalize(a){if(!Array.isArray(a))return[];return a.map(t=>({id:String(t&&t.id||crypto.randomUUID()),name:String(t&&t.name||"").trim(),address:String(t&&t.address||"").trim(),rent:num(t&&t.rent),charges:num(t&&t.charges)})).filter(t=>t.name&&t.address&&Number.isFinite(t.rent)&&Number.isFinite(t.charges))}
function num(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*100)/100:NaN}
function money(v){return Number(v).toFixed(2)}
function render(){
 e.table.innerHTML="";
 if(!state.tenants.length)e.table.innerHTML='<tr><td colspan="5">Aucun locataire.</td></tr>';
 state.tenants.forEach(t=>{const tr=document.createElement("tr");tr.innerHTML='<td data-label="Nom">'+esc(t.name)+'</td><td data-label="Adresse">'+esc(t.address)+'</td><td data-label="Loyer">'+money(t.rent)+' EUR</td><td data-label="Charges">'+money(t.charges)+' EUR</td><td class="actions" data-label="Actions"><button type="button" data-edit="'+esc(t.id)+'">Modifier</button><button type="button" class="danger" data-delete="'+esc(t.id)+'">Supprimer</button></td>';e.table.appendChild(tr)});
 e.table.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editTenant(b.dataset.edit));e.table.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteTenant(b.dataset.delete));
 const old=e.select.value;e.select.innerHTML="";
 if(!state.tenants.length){e.select.add(new Option("Aucun locataire",""));e.select.disabled=true;e.one.disabled=true}
 else{state.tenants.forEach(t=>e.select.add(new Option(t.name,t.id)));e.select.disabled=false;e.one.disabled=false;if(state.tenants.some(t=>t.id===old))e.select.value=old}
}
function saveTenant(ev){
 ev.preventDefault();
 const t={id:e.id.value||crypto.randomUUID(),name:e.name.value.trim(),address:e.address.value.trim(),rent:num(e.rent.value),charges:num(e.charges.value)};
 if(!t.name||!t.address||!Number.isFinite(t.rent)||!Number.isFinite(t.charges))return alert("Veuillez remplir tous les champs locataire avec des valeurs valides.");
 const i=state.tenants.findIndex(x=>x.id===(state.editing||t.id));if(i>=0&&state.editing)state.tenants[i]=t;else state.tenants.push(t);persist();resetForm();render()
}
function editTenant(id){const t=state.tenants.find(x=>x.id===id);if(!t)return;state.editing=t.id;e.id.value=t.id;e.name.value=t.name;e.address.value=t.address;e.rent.value=t.rent;e.charges.value=t.charges;e.submit.textContent="Mettre a jour"}
function deleteTenant(id){const t=state.tenants.find(x=>x.id===id);if(!t||!confirm("Supprimer "+t.name+" ?"))return;state.tenants=state.tenants.filter(x=>x.id!==id);if(state.editing===id)resetForm();persist();render()}
function resetForm(){state.editing=null;e.form.reset();e.id.value="";e.charges.value="0";e.submit.textContent="Ajouter"}
async function openJson(){
 if(!window.showOpenFilePicker)return e.json.click();
 try{const a=await window.showOpenFilePicker({multiple:false,types:[{description:"JSON Files",accept:{"application/json":[".json"]}}]});const h=a[0];state.tenants=normalize(JSON.parse(await(await h.getFile()).text()));state.jsonHandle=h;persist();resetForm();render();alert("Fichier JSON charge.")}catch(x){if(x&&x.name!=="AbortError")alert("Impossible de charger le JSON.")}
}
async function saveOpenedJson(){if(!state.jsonHandle)return alert("Aucun fichier ouvert. Utilisez d'abord 'Ouvrir un JSON'.");try{const w=await state.jsonHandle.createWritable();await w.write(JSON.stringify(state.tenants,null,2));await w.close();alert("Fichier JSON enregistre.")}catch{alert("Impossible d'enregistrer dans le fichier ouvert.")}}
function importJson(ev){const f=ev.target.files&&ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state.tenants=normalize(JSON.parse(String(r.result||"[]")));persist();resetForm();render();alert("Fichier JSON charge.")}catch{alert("JSON invalide.")}finally{ev.target.value=""}};r.readAsText(f)}
function downloadJson(){const b=new Blob([JSON.stringify(state.tenants,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="tenants.json";a.click();URL.revokeObjectURL(u)}
function generateAll(){if(!state.tenants.length)return alert("Ajoutez au moins un locataire.");if(!window.jspdf||!window.jspdf.jsPDF)return alert("La librairie PDF n'est pas chargee.");saveSettings();const d=new Date(),m=d.getMonth()+1,y=d.getFullYear();state.tenants.forEach((t,i)=>setTimeout(()=>makePdf(t,m,y),i*180));alert("Generation lancee pour "+state.tenants.length+" locataire(s).")}
function generateOne(){const t=state.tenants.find(x=>x.id===e.select.value);if(!t)return alert("Selectionnez un locataire.");if(!window.jspdf||!window.jspdf.jsPDF)return alert("La librairie PDF n'est pas chargee.");saveSettings();const d=new Date();makePdf(t,d.getMonth()+1,d.getFullYear())}
function fr(v){const d=new Date(v);return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()}
function safe(v){return String(v||"locataire").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}
function makePdf(t,m,y){
 const jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:"mm",format:"a4"}),total=num(t.rent+t.charges),start=fr(new Date(y,m-1,1)),end=fr(new Date(y,m,0)),id=y+String(m).padStart(2,"0")+"-"+(safe(t.name).replaceAll("-","").slice(0,6)||"TENANT").toUpperCase();
 doc.setTextColor(31,41,55);doc.setDrawColor(70,77,87);doc.setLineWidth(.6);doc.rect(10,10,190,277);doc.setLineWidth(.2);doc.line(14,28,196,28);
 doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("QUITTANCE DE LOYER",14,21);doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text("Periode: "+months[m-1]+" "+y,14,26);doc.setFontSize(10);doc.text("Quittance n°: "+id,196,17,{align:"right"});doc.text("Date d'emission: "+fr(new Date()),196,23,{align:"right"});
 doc.setDrawColor(160,170,182);doc.roundedRect(14,34,88,54,1.8,1.8);doc.roundedRect(108,34,88,54,1.8,1.8);doc.setFont("helvetica","bold");doc.setFontSize(11.5);doc.text("Bailleur",18,42);doc.text("Locataire",112,42);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text("Bailleur: "+state.settings.ownerName,18,56,{maxWidth:80});doc.text("Adresse: "+state.settings.ownerAddress,18,64,{maxWidth:80});doc.text("Locataire: "+t.name,112,56,{maxWidth:80});doc.text("Adresse: "+t.address,112,64,{maxWidth:80});
 doc.roundedRect(14,94,182,34,1.8,1.8);doc.setFont("helvetica","bold");doc.setFontSize(11.5);doc.text("Objet",18,102);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text("Paiement du loyer et des charges pour la periode du "+start+" au "+end+".",18,111,{maxWidth:174});
 doc.roundedRect(14,134,182,64,1.8,1.8);doc.setFont("helvetica","bold");doc.setFontSize(11.5);doc.text("Detail des sommes",18,142);doc.line(18,147,192,147);doc.setFontSize(10);doc.text("Libelle",18,153);doc.text("Montant (EUR)",192,153,{align:"right"});doc.line(18,156,192,156);doc.setFont("helvetica","normal");doc.text("Loyer hors charges",18,163);doc.text(money(t.rent),192,163,{align:"right"});doc.text("Charges",18,170);doc.text(money(t.charges),192,170,{align:"right"});doc.line(18,174,192,174);doc.setFont("helvetica","bold");doc.text("Total attendu",18,180);doc.text(money(total),192,180,{align:"right"});doc.text("Total regle",18,187);doc.text(money(total),192,187,{align:"right"});doc.setFont("helvetica","normal");doc.text("Solde",18,194);doc.text("0.00",192,194,{align:"right"});
 doc.roundedRect(14,204,112,48,1.8,1.8);doc.setFontSize(10);doc.text("Le bailleur reconnait avoir recu la somme indiquee ci-dessus au titre du loyer et des charges.",18,214,{maxWidth:104});doc.text("Cette quittance annule tout recu precedent pour la periode consideree.",18,230,{maxWidth:104});doc.roundedRect(132,204,64,48,1.8,1.8);doc.setFont("helvetica","bold");doc.setFontSize(10.5);doc.text("Pour acquit",164,210,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text(state.settings.ownerName,164,248,{align:"center"});addSignature(doc,136,210,56,26);
 doc.setFont("helvetica","italic");doc.setFontSize(8.5);doc.setTextColor(86,93,104);doc.text("Document genere automatiquement - article 21 de la loi n° 89-462 du 6 juillet 1989.",105,278,{align:"center"});doc.save("quittance_"+safe(t.name)+"_"+y+"-"+String(m).padStart(2,"0")+".pdf")
}
function addSignature(doc,x,y,w,h){const d=state.settings.signatureDataUrl;if(!d){doc.setFont("helvetica","italic");doc.setFontSize(9);doc.setTextColor(120,126,134);doc.text("(Aucune image de signature)",x+2,y+9);return}try{const p=doc.getImageProperties(d),s=Math.min(w/p.width,h/p.height,1),rw=p.width*s,rh=p.height*s;doc.addImage(d,imageFormat(d),x+(w-rw)/2,y+(h-rh)/2,rw,rh)}catch{}}
function imageFormat(d){if(d.startsWith("data:image/png"))return"PNG";if(d.startsWith("data:image/jpeg"))return"JPEG";return"WEBP"}
function validImage(d){return typeof d==="string"&&/^data:image\/(png|jpeg|webp);/.test(d)}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}