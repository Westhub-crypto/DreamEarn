/**
 * ╔══════════════════════════════════════════╗
 * ║         DREAMEARN – BACKEND SERVER       ║
 * ║   Node.js + Express + MongoDB + Squad    ║
 * ╚══════════════════════════════════════════╝
 */

require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const axios     = require('axios');
const path      = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────
//  MONGODB CONNECTION
// ─────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ─────────────────────────────────────────
//  SCHEMAS
// ─────────────────────────────────────────

const userSchema = new mongoose.Schema({
  username:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  passwordHash:    { type: String, required: true },
  referralCode:    { type: String, unique: true },
  referredBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  balance:         { type: Number, default: 0 },
  depositBalance:  { type: Number, default: 0 },
  totalEarned:     { type: Number, default: 0 },
  tasksCompleted:  { type: Number, default: 0 },
  referralCount:   { type: Number, default: 0 },
  activePlan:      { type: String, default: null },
  tier:            { type: String, enum: ['Bronze','Silver','Gold','Platinum'], default: 'Bronze' },
  status:          { type: String, enum: ['active','banned'], default: 'active' },
  isAdmin:         { type: Boolean, default: false },
  lastCheckIn:     { type: Date, default: null },
  checkInStreak:   { type: Number, default: 0 },
  bankDetails: {
    bankName:      { type: String, default: '' },
    bankCode:      { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName:   { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
});
userSchema.methods.toSafe = function () {
  const o = this.toObject(); delete o.passwordHash; return o;
};
const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  description:   { type: String, required: true },
  type:          { type: String, enum: ['survey','video','offer','content','referral','telegram','other'], required: true },
  reward:        { type: Number, required: true },
  icon:          { type: String, default: '📋' },
  link:          { type: String, default: '' },
  estimatedTime: { type: String, default: '5 min' },
  requiresPlan:  { type: Boolean, default: false },
  status:        { type: String, enum: ['active','paused','archived'], default: 'active' },
  completions:   { type: Number, default: 0 },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:     { type: Date, default: Date.now },
});
const Task = mongoose.model('Task', taskSchema);

const completionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task:        { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  reward:      { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
});
const Completion = mongoose.model('Completion', completionSchema);

const withdrawalSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:          { type: Number, required: true },
  bankName:        { type: String, required: true },
  bankCode:        { type: String, required: true },
  accountNumber:   { type: String, required: true },
  accountName:     { type: String, required: true },
  walletType:      { type: String, enum: ['referral','activity'], default: 'activity' },
  status:          { type: String, enum: ['pending','processing','approved','rejected'], default: 'pending' },
  squadRef:        { type: String, default: null },
  rejectionReason: { type: String, default: null },
  processedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt:     { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now },
});
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

const depositSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:    { type: Number, required: true },
  squadRef:  { type: String, required: true, unique: true },
  channel:   { type: String, default: 'card' },
  status:    { type: String, enum: ['pending','confirmed','failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
const Deposit = mongoose.model('Deposit', depositSchema);

const planSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId:       { type: String, required: true },
  planName:     { type: String, required: true },
  amountPaid:   { type: Number, required: true },
  welcomeBonus: { type: Number, required: true },
  activatedAt:  { type: Date, default: Date.now },
  status:       { type: String, enum: ['active','expired'], default: 'active' },
});
const Plan = mongoose.model('Plan', planSchema);

const supportSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestName: { type: String, default: 'Guest' },
  messages:  [{
    from:  { type: String, enum: ['user','agent'], required: true },
    text:  { type: String, required: true },
    time:  { type: Date, default: Date.now },
    read:  { type: Boolean, default: false },
  }],
  status:    { type: String, enum: ['open','resolved'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Support = mongoose.model('Support', supportSchema);

const settingsSchema = new mongoose.Schema({
  squadPublicKeyLive:    { type: String, default: '' },
  squadSecretKeyLive:    { type: String, default: '' },
  squadPublicKeySandbox: { type: String, default: '' },
  squadSecretKeySandbox: { type: String, default: '' },
  squadMode:             { type: String, enum: ['sandbox','live'], default: 'sandbox' },
  minWithdrawal:         { type: Number, default: 100000 },
  maxWithdrawal:         { type: Number, default: 50000000 },
  referralRate:          { type: Number, default: 15 },
  referralBonus:         { type: Number, default: 50000 },
  withdrawalWindowStart: { type: String, default: '16:30' },
  withdrawalWindowEnd:   { type: String, default: '17:30' },
  platformStatus:        { type: String, default: 'online' },
  siteName:              { type: String, default: 'DreamEarn' },
});
const Settings = mongoose.model('Settings', settingsSchema);

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dreamearn-change-this-in-production';
const sign  = p  => jwt.sign(p, JWT_SECRET, { expiresIn: '7d' });
const fmtN  = k  => `₦${(k/100).toLocaleString('en-NG',{minimumFractionDigits:2})}`;
const genRef = u => 'DREAM-' + u.toUpperCase().slice(0,4) + Math.floor(1000+Math.random()*9000);

async function getSettings() {
  let s = await Settings.findOne();
  if (!s) s = await new Settings().save();
  return s;
}
async function squadBaseUrl() {
  const s = await getSettings();
  return s.squadMode==='live' ? 'https://api-d.squadco.com' : 'https://sandbox-api-d.squadco.com';
}
async function getSquadSecret() {
  const s = await getSettings();
  return s.squadMode==='live' ? s.squadSecretKeyLive : s.squadSecretKeySandbox;
}
async function getSquadPublic() {
  const s = await getSettings();
  return s.squadMode==='live' ? s.squadPublicKeyLive : s.squadPublicKeySandbox;
}

const auth  = (req,res,next) => { const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({success:false,message:'No token'}); try{req.user=jwt.verify(h.split(' ')[1],JWT_SECRET);next();}catch{res.status(401).json({success:false,message:'Invalid token'});} };
const admin = (req,res,next) => { if(!req.user?.isAdmin) return res.status(403).json({success:false,message:'Admin only'}); next(); };

// ─────────────────────────────────────────
//  AUTH  /api/auth
// ─────────────────────────────────────────
const authR = express.Router();
authR.post('/register', async (req,res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    if (!username||!email||!password) return res.status(400).json({success:false,message:'All fields required'});
    if (password.length < 8) return res.status(400).json({success:false,message:'Password must be 8+ characters'});
    if (await User.findOne({$or:[{email},{username}]})) return res.status(400).json({success:false,message:'Username or email already taken'});
    let referredBy=null;
    if (referralCode) { const ref=await User.findOne({referralCode}); if(ref){referredBy=ref._id;ref.referralCount++;await ref.save();} }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await new User({username,email,passwordHash,referralCode:genRef(username),referredBy}).save();
    res.status(201).json({success:true,token:sign({id:user._id,username:user.username,isAdmin:false}),user:user.toSafe()});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
authR.post('/login', async (req,res) => {
  try {
    const {login,password} = req.body;
    const user = await User.findOne({$or:[{email:login},{username:login}]});
    if (!user||!(await bcrypt.compare(password,user.passwordHash))) return res.status(401).json({success:false,message:'Invalid credentials'});
    if (user.status==='banned') return res.status(403).json({success:false,message:'Account banned. Contact support.'});
    res.json({success:true,token:sign({id:user._id,username:user.username,isAdmin:user.isAdmin}),user:user.toSafe()});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
authR.post('/admin-login', async (req,res) => {
  try {
    const {email,password} = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || 'godwinoloja4@gmail.com';
    const adminPass  = process.env.ADMIN_PASSWORD || '@Westpablo1';
    if (email===adminEmail && password===adminPass) {
      let user = await User.findOne({email:adminEmail});
      if (!user) { const hash=await bcrypt.hash(password,12); user=await new User({username:'admin',email:adminEmail,passwordHash:hash,referralCode:'DREAM-ADMIN',isAdmin:true}).save(); }
      return res.json({success:true,token:sign({id:user._id,username:user.username,isAdmin:true}),user:user.toSafe()});
    }
    res.status(401).json({success:false,message:'Invalid admin credentials'});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
authR.get('/me', auth, async (req,res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if(!user) return res.status(404).json({success:false,message:'Not found'});
  res.json({success:true,user});
});
authR.put('/bank', auth, async (req,res) => {
  try {
    const {bankName,bankCode,accountNumber,accountName} = req.body;
    const user = await User.findByIdAndUpdate(req.user.id,{bankDetails:{bankName,bankCode,accountNumber,accountName}},{new:true});
    res.json({success:true,user:user.toSafe()});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.use('/api/auth', authR);

// ─────────────────────────────────────────
//  TASKS  /api/tasks
// ─────────────────────────────────────────
const tasksR = express.Router();
tasksR.get('/', auth, async (req,res) => {
  try {
    const tasks = await Task.find({status:'active'}).sort({createdAt:-1});
    const done = (await Completion.find({user:req.user.id}).select('task')).map(c=>c.task.toString());
    res.json({success:true,tasks:tasks.map(t=>({...t.toObject(),completed:done.includes(t._id.toString())}))});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
tasksR.get('/all', auth, admin, async (req,res) => {
  try { res.json({success:true,tasks:await Task.find({status:{$ne:'archived'}}).sort({createdAt:-1})}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
tasksR.post('/', auth, admin, async (req,res) => {
  try {
    const {title,description,type,reward,icon,link,estimatedTime,requiresPlan,status} = req.body;
    if (!title||!description||!type||!reward) return res.status(400).json({success:false,message:'Required fields missing'});
    const task = await new Task({title,description,type,reward:Math.round(parseFloat(reward)*100),icon:icon||'📋',link,estimatedTime,requiresPlan:!!requiresPlan,status:status||'active',createdBy:req.user.id}).save();
    res.status(201).json({success:true,task});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
tasksR.put('/:id', auth, admin, async (req,res) => {
  try {
    const upd={...req.body}; if(upd.reward) upd.reward=Math.round(parseFloat(upd.reward)*100);
    const task=await Task.findByIdAndUpdate(req.params.id,upd,{new:true});
    if(!task) return res.status(404).json({success:false,message:'Not found'});
    res.json({success:true,task});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
tasksR.delete('/:id', auth, admin, async (req,res) => {
  try { await Task.findByIdAndUpdate(req.params.id,{status:'archived'}); res.json({success:true}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
tasksR.post('/:id/complete', auth, async (req,res) => {
  try {
    const task=await Task.findById(req.params.id);
    if (!task||task.status!=='active') return res.status(404).json({success:false,message:'Task not available'});
    if (await Completion.findOne({user:req.user.id,task:task._id})) return res.status(400).json({success:false,message:'Already completed'});
    const user=await User.findById(req.user.id);
    user.balance+=task.reward; user.totalEarned+=task.reward; user.tasksCompleted++;
    const n=user.totalEarned/100;
    user.tier=n>=50000?'Platinum':n>=10000?'Gold':n>=2000?'Silver':'Bronze';
    await user.save();
    await new Completion({user:req.user.id,task:task._id,reward:task.reward}).save();
    task.completions++; await task.save();
    if (user.referredBy) { const s=await getSettings(); await User.findByIdAndUpdate(user.referredBy,{$inc:{balance:Math.floor(task.reward*s.referralRate/100),totalEarned:Math.floor(task.reward*s.referralRate/100)}}); }
    res.json({success:true,reward:task.reward,balance:user.balance,message:`You earned ${fmtN(task.reward)}!`});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.use('/api/tasks', tasksR);

// ─────────────────────────────────────────
//  CHECK-IN  /api/checkin
// ─────────────────────────────────────────
app.post('/api/checkin', auth, async (req,res) => {
  try {
    const user=await User.findById(req.user.id);
    const today=new Date(); today.setHours(0,0,0,0);
    if (user.lastCheckIn && new Date(user.lastCheckIn)>=today) return res.status(400).json({success:false,message:'Already checked in today'});
    const yesterday=new Date(today); yesterday.setDate(today.getDate()-1);
    if (!user.lastCheckIn||new Date(user.lastCheckIn)<yesterday) user.checkInStreak=0;
    user.checkInStreak=(user.checkInStreak%7)+1;
    const REWARDS={1:5000,2:5000,3:5000,4:10000,5:5000,6:5000,7:20000};
    const reward=REWARDS[user.checkInStreak]||5000;
    user.balance+=reward; user.totalEarned+=reward; user.lastCheckIn=new Date();
    await user.save();
    res.json({success:true,day:user.checkInStreak,reward,balance:user.balance,message:`Day ${user.checkInStreak} – ${fmtN(reward)} earned!`});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ─────────────────────────────────────────
//  WITHDRAWALS  /api/withdrawals
// ─────────────────────────────────────────
const wdR = express.Router();
wdR.post('/', auth, async (req,res) => {
  try {
    const {amount,bankName,bankCode,accountNumber,accountName,walletType} = req.body;
    if (!amount||!bankName||!accountNumber||!accountName) return res.status(400).json({success:false,message:'All fields required'});
    const s=await getSettings(); const amountKobo=Math.round(parseFloat(amount)*100);
    if (amountKobo<s.minWithdrawal) return res.status(400).json({success:false,message:`Min withdrawal is ${fmtN(s.minWithdrawal)}`});
    const user=await User.findById(req.user.id);
    if (user.balance<amountKobo) return res.status(400).json({success:false,message:'Insufficient balance'});
    user.balance-=amountKobo; await user.save();
    const wd=await new Withdrawal({user:req.user.id,amount:amountKobo,bankName,bankCode:bankCode||'000',accountNumber,accountName,walletType:walletType||'activity'}).save();
    res.status(201).json({success:true,withdrawal:wd,message:'Withdrawal submitted. Processed within 24h.'});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
wdR.get('/mine', auth, async (req,res) => {
  try { res.json({success:true,withdrawals:await Withdrawal.find({user:req.user.id}).sort({createdAt:-1})}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
wdR.get('/all', auth, admin, async (req,res) => {
  try {
    const {status}=req.query;
    res.json({success:true,withdrawals:await Withdrawal.find(status?{status}:{}).populate('user','username email').sort({createdAt:-1})});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
wdR.post('/:id/approve', auth, admin, async (req,res) => {
  try {
    const wd=await Withdrawal.findById(req.params.id).populate('user');
    if (!wd) return res.status(404).json({success:false,message:'Not found'});
    if (wd.status!=='pending') return res.status(400).json({success:false,message:'Only pending withdrawals can be approved'});
    wd.status='processing'; await wd.save();
    const secret=await getSquadSecret(); const base=await squadBaseUrl(); const txRef=`DREAM-WD-${wd._id}-${Date.now()}`;
    const r=await axios.post(`${base}/payout/initiate`,{transaction_reference:txRef,amount:wd.amount,bank_code:wd.bankCode,account_number:wd.accountNumber,account_name:wd.accountName,currency_id:'NGN',remark:`DreamEarn payout @${wd.user.username}`},{headers:{Authorization:`Bearer ${secret}`}});
    if (r.data?.success) {
      wd.status='approved'; wd.squadRef=r.data?.data?.transaction_reference||txRef; wd.processedBy=req.user.id; wd.processedAt=new Date(); await wd.save();
      res.json({success:true,message:'Approved! Payment sent via Squad.',ref:wd.squadRef});
    } else { wd.status='pending'; await wd.save(); res.status(400).json({success:false,message:'Squad transfer failed',squadError:r.data}); }
  } catch(e){ const wd=await Withdrawal.findById(req.params.id); if(wd?.status==='processing'){wd.status='pending';await wd.save();} res.status(500).json({success:false,message:e.response?.data?.message||e.message}); }
});
wdR.post('/:id/reject', auth, admin, async (req,res) => {
  try {
    const wd=await Withdrawal.findById(req.params.id);
    if (!wd) return res.status(404).json({success:false,message:'Not found'});
    if (!['pending','processing'].includes(wd.status)) return res.status(400).json({success:false,message:'Cannot reject'});
    await User.findByIdAndUpdate(wd.user,{$inc:{balance:wd.amount}});
    wd.status='rejected'; wd.rejectionReason=req.body.reason||'No reason'; wd.processedBy=req.user.id; wd.processedAt=new Date(); await wd.save();
    res.json({success:true,message:'Rejected & balance refunded'});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.use('/api/withdrawals', wdR);

// ─────────────────────────────────────────
//  DEPOSITS  /api/deposits
// ─────────────────────────────────────────
app.get('/api/deposits/public-key', auth, async (req,res) => { res.json({success:true,public_key:await getSquadPublic()}); });
app.post('/api/deposits/initiate', auth, async (req,res) => {
  try {
    const amountKobo=Math.round(parseFloat(req.body.amount)*100);
    if (amountKobo<10000) return res.status(400).json({success:false,message:'Min deposit ₦100'});
    const user=await User.findById(req.user.id); const secret=await getSquadSecret(); const base=await squadBaseUrl(); const txRef=`DREAM-DEP-${req.user.id}-${Date.now()}`;
    const r=await axios.post(`${base}/transaction/initiate`,{email:user.email,amount:amountKobo,currency:'NGN',transaction_ref:txRef,callback_url:`${process.env.BASE_URL}/api/deposits/webhook`,metadata:{user_id:req.user.id}},{headers:{Authorization:`Bearer ${secret}`}});
    if (r.data?.success) { await new Deposit({user:req.user.id,amount:amountKobo,squadRef:txRef}).save(); res.json({success:true,checkout_url:r.data.data?.checkout_url,txRef}); }
    else res.status(400).json({success:false,message:'Could not initiate deposit'});
  } catch(e){res.status(500).json({success:false,message:e.response?.data?.message||e.message});}
});
app.post('/api/deposits/webhook', async (req,res) => {
  try {
    const {transaction_ref,transaction_status} = req.body;
    if (transaction_status!=='SUCCESS') return res.sendStatus(200);
    const dep=await Deposit.findOne({squadRef:transaction_ref});
    if (!dep||dep.status==='confirmed') return res.sendStatus(200);
    dep.status='confirmed'; await dep.save();
    await User.findByIdAndUpdate(dep.user,{$inc:{depositBalance:dep.amount}});
    res.sendStatus(200);
  } catch(e){console.error('Webhook:',e.message);res.sendStatus(500);}
});

// ─────────────────────────────────────────
//  SUPPORT CHAT  /api/support
// ─────────────────────────────────────────
app.post('/api/support/message', async (req,res) => {
  try {
    const {text,userId,guestName} = req.body;
    if (!text) return res.status(400).json({success:false,message:'Message required'});
    let conv=userId ? await Support.findOne({user:userId,status:'open'}) : null;
    if (!conv) conv=await new Support({user:userId||undefined,guestName:guestName||'Guest',messages:[]}).save();
    conv.messages.push({from:'user',text}); conv.updatedAt=new Date(); await conv.save();
    res.json({success:true,conversationId:conv._id});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.get('/api/support/my', async (req,res) => {
  try { const {userId}=req.query; res.json({success:true,conversation:userId?await Support.findOne({user:userId,status:'open'}):null}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
app.get('/api/support/all', auth, admin, async (req,res) => {
  try { res.json({success:true,conversations:await Support.find().populate('user','username email').sort({updatedAt:-1})}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
app.post('/api/support/:id/reply', auth, admin, async (req,res) => {
  try {
    const conv=await Support.findById(req.params.id);
    if (!conv) return res.status(404).json({success:false,message:'Not found'});
    conv.messages.push({from:'agent',text:req.body.text}); conv.updatedAt=new Date(); await conv.save();
    res.json({success:true});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.post('/api/support/:id/resolve', auth, admin, async (req,res) => {
  try { await Support.findByIdAndUpdate(req.params.id,{status:'resolved'}); res.json({success:true}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});

// ─────────────────────────────────────────
//  USERS  /api/users
// ─────────────────────────────────────────
app.get('/api/users', auth, admin, async (req,res) => {
  try {
    const {search}=req.query;
    const filter=search?{$or:[{username:new RegExp(search,'i')},{email:new RegExp(search,'i')}]}:{};
    res.json({success:true,users:await User.find(filter).select('-passwordHash').sort({createdAt:-1}),total:await User.countDocuments()});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.get('/api/users/stats', auth, admin, async (req,res) => {
  try {
    const today=new Date(); today.setHours(0,0,0,0);
    const [total,newToday,pendingWd,paid]=await Promise.all([User.countDocuments(),User.countDocuments({createdAt:{$gte:today}}),Withdrawal.countDocuments({status:'pending'}),Withdrawal.aggregate([{$match:{status:'approved'}},{$group:{_id:null,total:{$sum:'$amount'}}}])]);
    res.json({success:true,stats:{total,newToday,pendingWithdrawals:pendingWd,totalPaidKobo:paid[0]?.total||0}});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});
app.patch('/api/users/:id/status', auth, admin, async (req,res) => {
  try { await User.findByIdAndUpdate(req.params.id,{status:req.body.status}); res.json({success:true}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
app.delete('/api/users/:id', auth, admin, async (req,res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({success:true}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});

// ─────────────────────────────────────────
//  SETTINGS  /api/settings
// ─────────────────────────────────────────
app.get('/api/settings', auth, admin, async (req,res) => {
  try { const s=await getSettings(); const safe=s.toObject(); ['squadSecretKeyLive','squadSecretKeySandbox'].forEach(k=>{if(safe[k])safe[k]='••••'+safe[k].slice(-4);}); res.json({success:true,settings:safe}); }
  catch(e){res.status(500).json({success:false,message:e.message});}
});
app.put('/api/settings', auth, admin, async (req,res) => {
  try {
    const allowed=['squadPublicKeyLive','squadSecretKeyLive','squadPublicKeySandbox','squadSecretKeySandbox','squadMode','minWithdrawal','maxWithdrawal','referralRate','referralBonus','platformStatus','siteName','withdrawalWindowStart','withdrawalWindowEnd'];
    const update={};
    allowed.forEach(k=>{if(req.body[k]!==undefined)update[k]=req.body[k];});
    if(update.minWithdrawal) update.minWithdrawal=Math.round(parseFloat(update.minWithdrawal)*100);
    if(update.maxWithdrawal) update.maxWithdrawal=Math.round(parseFloat(update.maxWithdrawal)*100);
    if(update.referralBonus) update.referralBonus=Math.round(parseFloat(update.referralBonus)*100);
    let s=await Settings.findOne(); if(!s)s=new Settings();
    Object.assign(s,update); await s.save();
    res.json({success:true,message:'Settings updated'});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ─────────────────────────────────────────
//  SEED & SPA FALLBACK
// ─────────────────────────────────────────
async function seedAdmin() {
  const adminEmail=process.env.ADMIN_EMAIL||'godwinoloja4@gmail.com';
  if (!await User.findOne({email:adminEmail})) {
    const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD||'@Westpablo1',12);
    await new User({username:'admin',email:adminEmail,passwordHash:hash,referralCode:'DREAM-ADMIN',isAdmin:true}).save();
    console.log('✅ Admin account created');
  }
  if (!await Settings.findOne()) { await new Settings().save(); console.log('✅ Default settings created'); }
}

// ─────────────────────────────────────────
//  ROUTE HANDLING
// ─────────────────────────────────────────

// /masteradmin and /masteradmin/* → serve app (frontend handles it)
app.get('/masteradmin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/masteradmin/*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Block common admin path guesses for security
const BLOCKED_ADMIN_PATHS = ['/admin', '/admin/*', '/administrator', '/wp-admin', '/cpanel', '/dashboard/admin'];
BLOCKED_ADMIN_PATHS.forEach(route => {
  app.get(route, (_req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// All other routes → SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n🚀 DreamEarn → http://localhost:${PORT}`);
  await seedAdmin();
});
