const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const W=480,H=720,RX=40,LW=100,PY=560,K=2.2;
// Полосы: 0,1 — встречные, 2,3 — твоё направление
const CARS=[
 {name:'Жигули',price:0,max:170,acc:55,steer:250,color:'#c9a227'},
 {name:'Седан',price:2500,max:230,acc:75,steer:290,color:'#4aa3df'},
 {name:'Купе',price:7000,max:290,acc:100,steer:320,color:'#e63946'},
 {name:'Спорткар',price:18000,max:360,acc:130,steer:350,color:'#9b5de5'},
 {name:'Гиперкар',price:45000,max:440,acc:170,steer:380,color:'#2ec4b6'}
];
const TCOL=['#8d99ae','#e9c46a','#f4a261','#6d8f71','#b5838d','#a8dadc','#ddd'];
let save={money:0,owned:[0],sel:0,best:0};
try{const s=JSON.parse(localStorage.getItem('carGame'));if(s)save=Object.assign(save,s)}catch(e){}
const store=()=>{try{localStorage.setItem('carGame',JSON.stringify(save))}catch(e){}};
const $=id=>document.getElementById(id);
const keys={left:0,right:0,brake:0};
let run=null,last=0,off=0;

function renderMenu(msg){
  $('msg').textContent=msg||'';
  $('bank').textContent='Деньги: $'+save.money+'  ·  Рекорд заезда: $'+save.best;
  const g=$('garage');g.innerHTML='';
  CARS.forEach((c,i)=>{
    const own=save.owned.includes(i),d=document.createElement('div');
    d.className='card'+(save.sel===i?' sel':'');
    d.innerHTML=`<div class="sw" style="background:${c.color}"></div><div class="info"><b>${c.name}</b>Макс. ${c.max} км/ч · разгон ${c.acc} · руль ${c.steer}</div>`;
    const b=document.createElement('button');
    if(own){b.textContent=save.sel===i?'Выбрана':'Выбрать';b.disabled=save.sel===i;b.onclick=()=>{save.sel=i;store();renderMenu(msg)}}
    else{b.textContent='$'+c.price;b.disabled=save.money<c.price;b.onclick=()=>{save.money-=c.price;save.owned.push(i);save.sel=i;store();renderMenu('Куплена: '+c.name+'!')}}
    d.appendChild(b);g.appendChild(d);
  });
}

function laneX(l){return RX+LW*(l+.5)}
function start(){
  run={x:laneX(3),v:0,earned:0,t:0,spawn:0,cars:[],oncoming:false,over:false};
  $('menu').classList.add('hidden');
}
function trySpawn(){
  const dir=Math.random()<.55?-1:1,lane=dir<0?Math.floor(Math.random()*2):2+Math.floor(Math.random()*2);
  // скорость трафика: у каждой машины своя — медленные, средние и быстрые
  const s=dir<0?70+Math.random()*90:45+Math.random()*130;
  let y=-120;
  if(dir>0&&s>run.v+5){ if(Math.abs(run.x-laneX(lane))<LW) return; y=H+120; }
  else if(dir>0&&s>run.v-5) return;
  if(run.cars.some(c=>c.lane===lane&&Math.abs(c.y-y)<260))return;
  run.cars.push({lane,x:laneX(lane),y,dir,s,color:TCOL[Math.floor(Math.random()*TCOL.length)],ahead:y<PY,paid:false});
}
function crash(){
  run.over=true;
  save.money+=Math.floor(run.earned);
  save.best=Math.max(save.best,Math.floor(run.earned));
  store();
  setTimeout(()=>{$('menu').classList.remove('hidden');renderMenu('Авария! Заработано за заезд: $'+Math.floor(run.earned))},700);
}
function update(dt){
  const r=run,car=CARS[save.sel];
  if(r.over)return;
  r.t+=dt;
  if(keys.brake)r.v=Math.max(0,r.v-190*dt);
  else r.v=Math.min(car.max,r.v+car.acc*(1-.65*r.v/car.max)*dt);
  const st=Math.min(1,r.v/60+.3);
  r.x+=(keys.right-keys.left)*car.steer*st*dt;
  r.x=Math.max(RX+26,Math.min(RX+4*LW-26,r.x));
  off=(off+r.v*K*dt)%80;
  r.spawn-=dt;
  if(r.spawn<=0){trySpawn();r.spawn=.45+Math.random()*.6}
  r.oncoming=r.x<RX+2*LW;
  if(r.oncoming&&r.v>40)r.earned+=r.v/40*dt*2; // бонус за езду по встречке
  for(const c of r.cars){
    const rel=c.dir>0?r.v-c.s:r.v+c.s;
    c.y+=rel*K*dt;
    if(c.dir>0){
      if(c.y<PY)c.ahead=true;
      if(c.ahead&&!c.paid&&c.y>PY+100){c.paid=true;r.earned+=5+c.s/8;} // деньги за обгон: быстрее машина — больше
    }
    if(Math.abs(c.x-r.x)<42&&Math.abs(c.y-PY)<80){crash();return}
  }
  r.cars=r.cars.filter(c=>c.y>-400&&c.y<H+400);
}
function drawCar(x,y,color,dir){
  ctx.save();ctx.translate(x,y);if(dir<0)ctx.rotate(Math.PI);
  ctx.fillStyle='#111';ctx.fillRect(-25,-30,6,18);ctx.fillRect(19,-30,6,18);ctx.fillRect(-25,14,6,18);ctx.fillRect(19,14,6,18);
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-22,-42,44,84,9);ctx.fill();
  ctx.fillStyle='rgba(20,30,45,.85)';ctx.fillRect(-16,-24,32,16);ctx.fillRect(-16,18,32,10);
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-16,-4,32,20);
  ctx.fillStyle='#fff6b0';ctx.fillRect(-19,-42,9,4);ctx.fillRect(10,-42,9,4);
  ctx.fillStyle='#d62828';ctx.fillRect(-19,38,9,4);ctx.fillRect(10,38,9,4);
  ctx.restore();
}
function draw(){
  ctx.fillStyle='#2f6b3a';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#2b2d33';ctx.fillRect(RX,0,4*LW,H);
  ctx.fillStyle='#eee';ctx.fillRect(RX-4,0,4,H);ctx.fillRect(RX+4*LW,0,4,H);
  ctx.fillStyle='#e9b824';ctx.fillRect(RX+2*LW-4,0,3,H);ctx.fillRect(RX+2*LW+1,0,3,H);
  ctx.fillStyle='#bbb';
  for(let y=-80+off;y<H;y+=80)for(const l of [1,3])ctx.fillRect(RX+l*LW-1.5,y,3,40);
  if(!run){return}
  for(const c of run.cars)drawCar(c.x,c.y,c.color,c.dir);
  drawCar(run.x,PY,CARS[save.sel].color,1);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,46);
  ctx.fillStyle='#fff';ctx.font='bold 20px system-ui';ctx.textAlign='left';
  ctx.fillText(Math.round(run.v)+' км/ч',12,30);
  ctx.textAlign='right';ctx.fillText('$'+Math.floor(run.earned),W-12,30);
  if(run.oncoming&&!run.over){ctx.textAlign='center';ctx.fillStyle='#ff9f1c';ctx.fillText('Встречка! +$',W/2,30)}
  if(run.over){ctx.fillStyle='rgba(214,40,40,.4)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 44px system-ui';ctx.textAlign='center';ctx.fillText('АВАРИЯ',W/2,H/2)}
}
function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(run)update(dt);
  draw();requestAnimationFrame(loop);
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
renderMenu('Обгоняй трафик по встречке — но не врежься!');
requestAnimationFrame(loop);
