// Логика в «пикселях» как в 2D-версии, в 3D переводим через S: X=(x-240)*S, Z=(y-PY)*S
const RX=40,LW=100,PY=560,K=2.2,S=0.035;
const CARS=[
 {name:'Жигули',price:0,max:170,acc:55,steer:250,color:0xc9a227},
 {name:'Седан',price:2500,max:230,acc:75,steer:290,color:0x4aa3df},
 {name:'Купе',price:7000,max:290,acc:100,steer:320,color:0xe63946},
 {name:'Спорткар',price:18000,max:360,acc:130,steer:350,color:0x9b5de5},
 {name:'Гиперкар',price:45000,max:440,acc:170,steer:380,color:0x2ec4b6}
];
const TCOL=[0x8d99ae,0xe9c46a,0xf4a261,0x6d8f71,0xb5838d,0xa8dadc,0xdddddd];
let save={money:0,owned:[0],sel:0,best:0};
try{const s=JSON.parse(localStorage.getItem('carGame3d'));if(s)save=Object.assign(save,s)}catch(e){}
const store=()=>{try{localStorage.setItem('carGame3d',JSON.stringify(save))}catch(e){}};
const $=id=>document.getElementById(id);
const hex=n=>'#'+n.toString(16).padStart(6,'0');
const keys={left:0,right:0,brake:0};
let run=null,last=0,offW=0,player=null,camX=0;

// ---------- 3D сцена ----------
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true});
renderer.setSize(480,720,false);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9bd0ee);
scene.fog=new THREE.Fog(0x9bd0ee,35,110);
const cam=new THREE.PerspectiveCamera(62,480/720,.1,220);
scene.add(new THREE.HemisphereLight(0xffffff,0x446644,.95));
const sun=new THREE.DirectionalLight(0xffffff,.7);sun.position.set(-6,12,6);scene.add(sun);
const MAT={},GEO={};
const mat=c=>MAT[c]||(MAT[c]=new THREE.MeshLambertMaterial({color:c}));
const box=(w,h,d,c,x,y,z)=>{const k=w+','+h+','+d;const m=new THREE.Mesh(GEO[k]||(GEO[k]=new THREE.BoxGeometry(w,h,d)),mat(c));m.position.set(x,y,z);return m};
function plane(w,l,c,y,z){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),mat(c));m.rotation.x=-Math.PI/2;m.position.set(0,y,z);scene.add(m)}
plane(400,500,0x2f6b3a,-.03,-150);
plane(14,500,0x2b2d33,0,-150);
for(const x of [-7,7])scene.add(box(.2,.03,500,0xeeeeee,x,.02,-150));
for(const x of [-.15,.15])scene.add(box(.1,.03,500,0xe9b824,x,.02,-150));
const zf=(i,P,N)=>-(N*P-20)+((i*P+offW)%(N*P));
const dashes=[],trees=[];
for(let i=0;i<30;i++)for(const x of [-3.5,3.5]){const d=box(.15,.03,2.6,0xdddddd,x,.02,0);d.userData.i=i;scene.add(d);dashes.push(d)}
const coneG=new THREE.ConeGeometry(1.4,4,7);
for(let i=0;i<18;i++)for(const s of [-1,1]){
  const t=new THREE.Group();
  t.add(box(.4,1.2,.4,0x6b4423,0,.6,0));
  const c=new THREE.Mesh(coneG,mat(0x1f7a3a));c.position.y=3;t.add(c);
  t.position.x=s*(10+Math.random()*6);t.userData.i=i;scene.add(t);trees.push(t);
}
function makeCar(color){
  const g=new THREE.Group();
  g.add(box(1.6,.6,3.2,color,0,.6,0));
  g.add(box(1.3,.5,1.7,0x1c2733,0,1.15,.2));
  g.add(box(1.34,.06,1.74,color,0,1.43,.2));
  for(const x of [-.85,.85])for(const z of [-1,1])g.add(box(.3,.6,.7,0x111111,x,.3,z));
  for(const x of [-.5,.5]){g.add(box(.35,.18,.06,0xfff6b0,x,.65,-1.62));g.add(box(.35,.18,.06,0xd62828,x,.65,1.62))}
  return g;
}

// ---------- гараж ----------
function renderMenu(msg){
  $('msg').textContent=msg||'';
  $('bank').textContent='Деньги: $'+save.money+'  ·  Рекорд заезда: $'+save.best;
  const g=$('garage');g.innerHTML='';
  CARS.forEach((c,i)=>{
    const own=save.owned.includes(i),d=document.createElement('div');
    d.className='card'+(save.sel===i?' sel':'');
    d.innerHTML=`<div class="sw" style="background:${hex(c.color)}"></div><div class="info"><b>${c.name}</b>Макс. ${c.max} км/ч · разгон ${c.acc} · руль ${c.steer}</div>`;
    const b=document.createElement('button');
    if(own){b.textContent=save.sel===i?'Выбрана':'Выбрать';b.disabled=save.sel===i;b.onclick=()=>{save.sel=i;store();setPlayer();renderMenu(msg)}}
    else{b.textContent='$'+c.price;b.disabled=save.money<c.price;b.onclick=()=>{save.money-=c.price;save.owned.push(i);save.sel=i;store();setPlayer();renderMenu('Куплена: '+c.name+'!')}}
    d.appendChild(b);g.appendChild(d);
  });
}
function setPlayer(){
  if(player)scene.remove(player);
  player=makeCar(CARS[save.sel].color);scene.add(player);
}

// ---------- игра ----------
const laneX=l=>RX+LW*(l+.5);
function start(){
  if(run)run.cars.forEach(c=>scene.remove(c.mesh));
  run={x:laneX(3),v:0,earned:0,t:0,spawn:0,cars:[],oncoming:false,over:false};
  setPlayer();
  $('menu').classList.add('hidden');$('hud').style.display='flex';$('flash').textContent='';
}
function trySpawn(){
  const dir=Math.random()<.55?-1:1,lane=dir<0?Math.floor(Math.random()*2):2+Math.floor(Math.random()*2);
  // у каждой машины своя скорость: медленные, средние и быстрые
  const s=dir<0?70+Math.random()*90:45+Math.random()*130;
  let y=-1500;
  if(dir>0&&s>run.v+5){if(Math.abs(run.x-laneX(lane))<LW)return;y=1000}
  else if(dir>0&&s>run.v-5)return;
  if(run.cars.some(c=>c.lane===lane&&Math.abs(c.y-y)<450))return;
  const mesh=makeCar(TCOL[Math.floor(Math.random()*TCOL.length)]);
  if(dir<0)mesh.rotation.y=Math.PI;
  scene.add(mesh);
  run.cars.push({lane,x:laneX(lane),y,dir,s,mesh,ahead:y<PY,paid:false});
}
function crash(){
  run.over=true;
  save.money+=Math.floor(run.earned);save.best=Math.max(save.best,Math.floor(run.earned));store();
  $('flash').textContent='АВАРИЯ!';$('flash').style.color='#e63946';
  setTimeout(()=>{$('menu').classList.remove('hidden');$('hud').style.display='none';renderMenu('Авария! Заработано за заезд: $'+Math.floor(run.earned))},900);
}
function update(dt){
  const r=run,car=CARS[save.sel];
  if(r.over)return;
  r.t+=dt;
  if(keys.brake)r.v=Math.max(0,r.v-190*dt);
  else r.v=Math.min(car.max,r.v+car.acc*(1-.65*r.v/car.max)*dt);
  const dir=keys.right-keys.left;
  r.x+=dir*car.steer*Math.min(1,r.v/60+.3)*dt;
  r.x=Math.max(RX+26,Math.min(RX+4*LW-26,r.x));
  offW+=r.v*K*dt*S;
  r.spawn-=dt;
  if(r.spawn<=0){trySpawn();r.spawn=.5+Math.random()*.6}
  r.oncoming=r.x<RX+2*LW;
  if(r.oncoming&&r.v>40)r.earned+=r.v/40*dt*2; // бонус за встречку
  for(const c of r.cars){
    c.y+=(c.dir>0?r.v-c.s:r.v+c.s)*K*dt;
    if(c.dir>0){
      if(c.y<PY)c.ahead=true;
      if(c.ahead&&!c.paid&&c.y>PY+100){c.paid=true;r.earned+=5+c.s/8} // быстрее машина — больше денег
    }
    if(Math.abs(c.x-r.x)<42&&Math.abs(c.y-PY)<80){crash();return}
  }
  r.cars=r.cars.filter(c=>{const keep=c.y>-1800&&c.y<1300;if(!keep)scene.remove(c.mesh);return keep});
  player.rotation.y+=(-dir*.18-player.rotation.y)*Math.min(1,dt*8);
  $('spd').textContent=Math.round(r.v)+' км/ч';$('cash').textContent='$'+Math.floor(r.earned);
  const f=$('flash');
  if(r.oncoming){f.textContent='Встречка! +$';f.style.color='#ff9f1c'}else f.textContent='';
}
function render(){
  dashes.forEach(d=>d.position.z=zf(d.userData.i,6,30));
  trees.forEach(t=>t.position.z=zf(t.userData.i,12,18));
  if(run){
    for(const c of run.cars)c.mesh.position.set((c.x-240)*S,0,(c.y-PY)*S);
    player.position.set((run.x-240)*S,0,0);
    camX+=((run.x-240)*S*.75-camX)*.1;
    cam.fov=60+(run.v/CARS[save.sel].max)*14;
  }else{camX=0;if(player)player.position.set(3.5*1.4,0,0)}
  cam.updateProjectionMatrix();
  const px=player?player.position.x:0;
  cam.position.set(camX,4.2,8.5);
  cam.lookAt(camX*.6+px*.2,.8,-14);
  renderer.render(scene,cam);
}
function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(run)update(dt);
  render();requestAnimationFrame(loop);
}
const map={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowDown:'brake',s:'brake',S:'brake'};
addEventListener('keydown',e=>{if(map[e.key]){keys[map[e.key]]=1;e.preventDefault()}});
addEventListener('keyup',e=>{if(map[e.key])keys[map[e.key]]=0});
document.querySelectorAll('#touch button').forEach(b=>{
  const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{keys[k]=1;e.preventDefault()});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=0));
});
$('play').onclick=start;
setPlayer();
renderMenu('Обгоняй трафик по встречке — но не врежься!');
requestAnimationFrame(loop);
