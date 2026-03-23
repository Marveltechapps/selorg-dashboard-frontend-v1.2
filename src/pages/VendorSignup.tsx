import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const API = (import.meta.env.VITE_API_URL as string) ||
            'http://localhost:5001/api/v1';

const STEPS = [
  { n:1, label:'Basic Info' },
  { n:2, label:'Contact' },
  { n:3, label:'Bank' },
  { n:4, label:'Documents' },
  { n:5, label:'Categories' },
];

const ALL_CATS = [
  'Fruits','Vegetables','Atta','Rice','Oil','Dals',
  'Dairy','Bread','Eggs','Masalas','Whole Spices',
  'Salt','Sugar','Jaggery','Dry Fruits','Seeds',
  'Grains & Pulses','Millets','Tea','Coffee','Breakfast','Spreads'
];

const DOCS = [
  { key:'fssai', label:'FSSAI License', required:true },
  { key:'gst', label:'GST Certificate', required:true },
  { key:'business', label:'Business License', required:false },
  { key:'iso', label:'ISO Certificate', required:false },
  { key:'insurance', label:'Insurance Certificate', required:false },
  { key:'coldChain', label:'Cold Chain Certificate', required:false },
];

const inp: React.CSSProperties = {
  width:'100%', height:40, padding:'0 12px',
  border:'1px solid #D1D5DB', borderRadius:8,
  fontSize:14, outline:'none', boxSizing:'border-box',
  background:'white', color:'#1F2937'
};
const lbl: React.CSSProperties = {
  display:'block', fontSize:13, fontWeight:600,
  color:'#374151', marginBottom:6
};
const err: React.CSSProperties = {
  fontSize:11, color:'#EF4444', marginTop:4
};

export default function VendorSignup() {
  const [sp] = useSearchParams();
  const token = sp.get('token');
  const [state, setState] = useState<'loading'|'invalid'|'expired'|'done'|'active'>('loading');
  const [info, setInfo] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errs, setErrs] = useState<Record<string,string>>({});
  const [docs, setDocs] = useState<Record<string,File|null>>({});
  const [f, setF] = useState({
    name:'', vendorType:'', description:'',
    registrationNumber:'', contactName:'', email:'',
    phone:'', addressLine1:'', city:'',
    state:'Tamil Nadu', postalCode:'',
    gstNumber:'', panNumber:'', bankName:'',
    accountType:'Current', bankAccount:'',
    ifscCode:'', accountHolder:'',
    selectedCategories:[] as string[], productType:''
  });

  const set = (k:string, v:any) => {
    setF(p => ({...p,[k]:v}));
    setErrs(p => { const n={...p}; delete n[k]; return n; });
  };

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    fetch(`${API}/vendor/public/verify-token?token=${token}`)
      .then(r=>r.json())
      .then(d => {
        if (d.success) {
          setInfo(d.vendor);
          setF(p => ({...p,
            name: d.vendor.name||'',
            email: d.vendor.email||'',
            phone: d.vendor.phone||'',
            vendorType: d.vendor.type||''
          }));
          setState('active');
        } else {
          if (d.error?.includes('expired')) setState('expired');
          else if (d.error?.includes('already')) setState('done');
          else setState('invalid');
        }
      })
      .catch(() => setState('invalid'));
  }, [token]);

  const validate = (s:number) => {
    const e: Record<string,string> = {};
    if (s===1) {
      if (!f.name.trim()) e.name='Vendor name is required';
      if (!f.vendorType) e.vendorType='Select vendor type';
    }
    if (s===2) {
      if (!f.contactName.trim()) e.contactName='Contact name required';
      if (!f.email.trim()) e.email='Email required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        e.email='Invalid email';
      if (!f.phone.trim()) e.phone='Phone required';
      if (!f.addressLine1.trim()) e.addressLine1='Address required';
      if (!f.city.trim()) e.city='City required';
      if (!f.postalCode.trim()) e.postalCode='Postal code required';
    }
    if (s===3) {
      if (!f.gstNumber.trim()) e.gstNumber='GST number required';
      else if (f.gstNumber.length!==15)
        e.gstNumber='GST must be 15 characters';
      if (!f.bankAccount.trim()) e.bankAccount='Account number required';
      if (!f.ifscCode.trim()) e.ifscCode='IFSC code required';
      if (!f.accountHolder.trim()) e.accountHolder='Account holder name required';
      if (!f.bankName) e.bankName='Select bank name';
    }
    if (s===5) {
      if (!f.selectedCategories.length)
        e.selectedCategories='Select at least one';
      if (!f.productType) e.productType='Select product type';
    }
    setErrs(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (validate(step)) { setStep(p=>p+1); window.scrollTo(0,0); }};
  const back = () => { setStep(p=>p-1); window.scrollTo(0,0); };

  const submit = async () => {
    if (!validate(step)) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/vendor/public/complete-profile`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, vendorData: f })
      });
      const d = await r.json();
      if (d.success) {
        // Upload pending documents
        if (d.vendorId) {
          for (const [key, file] of Object.entries(docs)) {
            if (!file) continue;
            const fd = new FormData();
            fd.append('documents', file);
            fd.append('documentType', key);
            fd.append('token', token||'');
            await fetch(
              `${API}/vendor/public/upload-documents/${d.vendorId}`,
              { method:'POST', body:fd }
            ).catch(()=>{});
          }
        }
        setSubmitted(true);
      } else {
        alert(d.error || 'Submission failed. Please try again.');
      }
    } catch { alert('Network error. Please try again.'); }
    finally { setBusy(false); }
  };

  const hdr = (
    <div style={{background:'#4F46E5',padding:'16px 24px',
                 display:'flex',alignItems:'center',
                 justifyContent:'space-between'}}>
      <div>
        <h1 style={{color:'white',margin:0,fontSize:20,fontWeight:700}}>
          SELORG
        </h1>
        <p style={{color:'#C7D2FE',margin:0,fontSize:12}}>
          Vendor Registration Portal
        </p>
      </div>
      {info && (
        <div style={{background:'rgba(255,255,255,0.15)',
                      padding:'6px 12px',borderRadius:20,
                      fontSize:12,color:'white'}}>
          Welcome, {info.name}
        </div>
      )}
    </div>
  );

  if (state==='loading') return (
    <div style={{minHeight:'100vh',display:'flex',
                 alignItems:'center',justifyContent:'center',
                 background:'#F9FAFB',fontFamily:'Arial,sans-serif'}}>
      {hdr}
      <p style={{color:'#6B7280',fontSize:14}}>
        Verifying your invite...
      </p>
    </div>
  );

  const errPage = (icon:string, title:string, msg:string) => (
    <div style={{minHeight:'100vh',background:'#F9FAFB',
                 fontFamily:'Arial,sans-serif'}}>
      {hdr}
      <div style={{display:'flex',alignItems:'center',
                   justifyContent:'center',paddingTop:80}}>
        <div style={{background:'white',borderRadius:16,padding:40,
                     textAlign:'center',maxWidth:400,
                     border:'1px solid #E5E7EB'}}>
          <div style={{fontSize:48,marginBottom:16}}>{icon}</div>
          <h2 style={{color:'#1F2937',marginBottom:8}}>{title}</h2>
          <p style={{color:'#6B7280',fontSize:14}}>{msg}</p>
          <a href="mailto:vendor@selorg.com"
             style={{display:'inline-block',marginTop:16,
                     color:'#4F46E5',fontSize:14,fontWeight:600}}>
            Contact vendor@selorg.com
          </a>
        </div>
      </div>
    </div>
  );

  if (state==='invalid') return errPage('❌','Invalid Invite Link',
    'This link is invalid. Contact the Selorg team for a new invite.');
  if (state==='expired') return errPage('⏰','Invite Expired',
    'This invite has expired. Contact the Selorg team for a new invite.');
  if (state==='done') return errPage('✅','Already Submitted',
    'You have already completed your profile. Our team will be in touch.');

  if (submitted) return (
    <div style={{minHeight:'100vh',background:'#F9FAFB',
                 fontFamily:'Arial,sans-serif'}}>
      {hdr}
      <div style={{display:'flex',alignItems:'center',
                   justifyContent:'center',paddingTop:80}}>
        <div style={{background:'white',borderRadius:16,padding:40,
                     textAlign:'center',maxWidth:480,
                     border:'1px solid #E5E7EB'}}>
          <div style={{width:72,height:72,background:'#D1FAE5',
                       borderRadius:'50%',display:'flex',
                       alignItems:'center',justifyContent:'center',
                       margin:'0 auto 20px',fontSize:32}}>✓</div>
          <h2 style={{color:'#1F2937',marginBottom:8,fontSize:22}}>
            Profile Submitted!
          </h2>
          <p style={{color:'#6B7280',fontSize:14,lineHeight:1.6}}>
            Thank you, <strong>{f.name}</strong>! Our team will
            review your application and contact you within
            2–3 business days.
          </p>
          <div style={{background:'#F0FDF4',borderRadius:8,
                       padding:'12px 16px',margin:'20px 0',
                       fontSize:13,color:'#166534'}}>
            We'll reach you at: <strong>{f.email}</strong>
          </div>
          <p style={{fontSize:12,color:'#9CA3AF'}}>
            Questions? Email vendor@selorg.com
          </p>
        </div>
      </div>
    </div>
  );

  // Step indicator
  const stepBar = (
    <div style={{background:'white',padding:'16px 24px',
                 borderBottom:'1px solid #E5E7EB',
                 display:'flex',alignItems:'center',
                 justifyContent:'center',gap:0,overflowX:'auto'}}>
      {STEPS.map((s,i) => (
        <React.Fragment key={s.n}>
          <div style={{display:'flex',flexDirection:'column',
                       alignItems:'center',gap:4,minWidth:72}}>
            <div style={{
              width:30,height:30,borderRadius:'50%',
              display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:12,fontWeight:700,
              background: step>s.n ? '#4F46E5' :
                          step===s.n ? '#4F46E5' : '#F3F4F6',
              color: step>=s.n ? 'white' : '#9CA3AF',
              border: step===s.n ?
                      '3px solid #C7D2FE' : 'none'
            }}>
              {step>s.n ? '✓' : s.n}
            </div>
            <span style={{fontSize:10,
              color: step>=s.n ? '#4F46E5' : '#9CA3AF',
              fontWeight: step===s.n ? 700 : 400,
              textAlign:'center',lineHeight:1.2}}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length-1 && (
            <div style={{flex:1,height:2,minWidth:16,
              background: step>i+1 ? '#4F46E5' : '#E5E7EB',
              margin:'0 4px',marginBottom:20}}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const card = (title:string, sub:string, children:React.ReactNode) => (
    <div style={{maxWidth:620,margin:'24px auto',padding:'0 16px 40px',
                 fontFamily:'Arial,sans-serif'}}>
      <div style={{background:'white',borderRadius:16,padding:32,
                   border:'1px solid #E5E7EB'}}>
        <h2 style={{fontSize:20,fontWeight:700,color:'#1F2937',
                    marginBottom:4,marginTop:0}}>{title}</h2>
        <p style={{fontSize:13,color:'#6B7280',marginBottom:24,
                   marginTop:0}}>{sub}</p>
        {children}
        <div style={{display:'flex',justifyContent:'space-between',
                     marginTop:28,paddingTop:20,
                     borderTop:'1px solid #F3F4F6'}}>
          {step>1
            ? <button onClick={back} style={{
                padding:'10px 22px',border:'1px solid #D1D5DB',
                borderRadius:8,background:'white',cursor:'pointer',
                fontSize:14,fontWeight:600,color:'#374151'}}>
                ← Back
              </button>
            : <div/>}
          {step < STEPS.length
            ? <button onClick={next} style={{
                padding:'10px 26px',background:'#4F46E5',
                border:'none',borderRadius:8,color:'white',
                cursor:'pointer',fontSize:14,fontWeight:700}}>
                Next →
              </button>
            : <button onClick={submit} disabled={busy} style={{
                padding:'10px 26px',
                background: busy ? '#9CA3AF' : '#4F46E5',
                border:'none',borderRadius:8,color:'white',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontSize:14,fontWeight:700}}>
                {busy ? 'Submitting...' : 'Submit Profile ✓'}
              </button>}
        </div>
      </div>
    </div>
  );

  const field = (
    key:string, label:string, required=false,
    opts?:{type?:string,placeholder?:string,as?:'select'|'textarea',
           options?:string[]}
  ) => (
    <div style={{marginBottom:16}}>
      <label style={lbl}>
        {label} {required && <span style={{color:'#EF4444'}}>*</span>}
      </label>
      {opts?.as==='select'
        ? <select style={{...inp,background:'white'}}
            value={(f as any)[key]}
            onChange={e=>set(key,e.target.value)}>
            <option value="">Select...</option>
            {(opts.options||[]).map(o=><option key={o}>{o}</option>)}
          </select>
        : opts?.as==='textarea'
        ? <textarea style={{...inp,height:80,padding:'8px 12px',
                            resize:'none'} as React.CSSProperties}
            value={(f as any)[key]}
            onChange={e=>set(key,e.target.value)}
            placeholder={opts.placeholder}/>
        : <input style={inp} type={opts?.type||'text'}
            value={(f as any)[key]}
            onChange={e=>set(key,e.target.value)}
            placeholder={opts?.placeholder}/>}
      {errs[key] && <p style={err}>{errs[key]}</p>}
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#F3F4F6',
                 fontFamily:'Arial,sans-serif'}}>
      {hdr}
      {stepBar}

      {step===1 && card('Basic Information','Tell us about your business',(
        <>
          {field('name','Business Name',true,
            {placeholder:'e.g. FreshMart Suppliers'})}
          {field('vendorType','Vendor Type',true,
            {as:'select',options:['Farmer','Distributor','Aggregator','Third-party']})}
          {field('registrationNumber','Registration / CIN Number',false,
            {placeholder:'e.g. U74999TN2020PTC123456 (optional)'})}
          {field('description','Business Description',false,
            {as:'textarea',placeholder:'Brief description...'})}
        </>
      ))}

      {step===2 && card('Contact & Address','Your contact details',(
        <>
          {field('contactName','Contact Person',true,
            {placeholder:'Primary contact name'})}
          {field('email','Email Address',true,
            {type:'email',placeholder:'business@example.com'})}
          {field('phone','Phone Number',true,
            {type:'tel',placeholder:'+91 98765 43210'})}
          {field('addressLine1','Address',true,
            {placeholder:'Street address'})}
          {field('city','City',true,{placeholder:'e.g. Chennai'})}
          {field('state','State',false,
            {as:'select',options:[
              'Tamil Nadu','Karnataka','Kerala',
              'Andhra Pradesh','Telangana','Maharashtra'
            ]})}
          {field('postalCode','Postal Code',true,
            {placeholder:'e.g. 600001'})}
        </>
      ))}

      {step===3 && card('Bank & Financial','For payment processing',(
        <>
          {field('gstNumber','GST Number',true,
            {placeholder:'15-character GST number'})}
          {field('panNumber','PAN Number',false,
            {placeholder:'10-character PAN (optional)'})}
          {field('bankName','Bank Name',true,
            {as:'select',options:[
              'ICICI Bank','HDFC Bank','State Bank of India',
              'Axis Bank','Kotak Mahindra','Bank of Baroda',
              'Punjab National Bank','Canara Bank'
            ]})}
          {field('bankAccount','Account Number',true,
            {placeholder:'Bank account number'})}
          {field('ifscCode','IFSC Code',true,
            {placeholder:'e.g. ICIC0001234'})}
          {field('accountHolder','Account Holder Name',true,
            {placeholder:'Name as per bank records'})}
          <div style={{marginBottom:16}}>
            <label style={lbl}>Account Type</label>
            <div style={{display:'flex',gap:12}}>
              {['Current','Savings'].map(t=>(
                <label key={t} style={{display:'flex',
                  alignItems:'center',gap:6,cursor:'pointer',
                  fontSize:14,color:'#374151'}}>
                  <input type="radio" name="accountType" value={t}
                    checked={f.accountType===t}
                    onChange={()=>set('accountType',t)}/>
                  {t}
                </label>
              ))}
            </div>
          </div>
        </>
      ))}

      {step===4 && card('Document Upload','Upload your business documents',(
        <>
          <div style={{background:'#FFFBEB',borderRadius:8,
                       padding:'10px 14px',marginBottom:20,
                       fontSize:12,color:'#92400E'}}>
            ⚠ FSSAI License and GST Certificate are required.
          </div>
          {DOCS.map(d=>{
            const file = docs[d.key];
            return (
              <div key={d.key} style={{
                border:'1px solid #E5E7EB',borderRadius:8,
                padding:'12px 16px',marginBottom:10,
                background: file ? '#F0FDF4' : 'white'
              }}>
                <div style={{display:'flex',alignItems:'center',
                             justifyContent:'space-between'}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:600,
                                  color:'#1F2937'}}>
                      {d.label}
                    </span>
                    {d.required && (
                      <span style={{marginLeft:6,fontSize:10,
                        background:'#FEE2E2',color:'#991B1B',
                        padding:'1px 6px',borderRadius:10}}>
                        Required
                      </span>
                    )}
                    {file && (
                      <span style={{marginLeft:6,fontSize:10,
                        background:'#D1FAE5',color:'#065F46',
                        padding:'1px 6px',borderRadius:10}}>
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <label style={{cursor:'pointer',
                    background: file ? '#D1FAE5' : '#EEF2FF',
                    color: file ? '#065F46' : '#4F46E5',
                    padding:'6px 14px',borderRadius:6,
                    fontSize:12,fontWeight:600}}>
                    {file ? 'Change' : 'Choose File'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                      style={{display:'none'}}
                      onChange={e=>{
                        const sel = e.target.files?.[0];
                        if (sel) {
                          if (sel.size > 5*1024*1024) {
                            alert('File too large. Max 5MB.');
                            return;
                          }
                          setDocs(p=>({...p,[d.key]:sel}));
                        }
                      }}/>
                  </label>
                </div>
                {file && (
                  <p style={{margin:'4px 0 0',fontSize:11,
                             color:'#6B7280'}}>
                    {file.name} ({(file.size/1024).toFixed(1)}KB)
                  </p>
                )}
                <p style={{margin:'4px 0 0',fontSize:11,
                           color:'#9CA3AF'}}>
                  PDF, JPG, PNG — Max 5MB
                </p>
              </div>
            );
          })}
        </>
      ))}

      {step===5 && card('Categories & Products',
        'What can you supply?',(
        <>
          <div style={{marginBottom:20}}>
            <label style={lbl}>
              Categories <span style={{color:'#EF4444'}}>*</span>
              <span style={{marginLeft:8,fontSize:11,
                            fontWeight:400,color:'#6B7280'}}>
                {f.selectedCategories.length} selected
              </span>
            </label>
            <div style={{display:'grid',
                              gridTemplateColumns:'1fr 1fr',
                              gap:6}}>
              {ALL_CATS.map(cat => (
                <label key={cat} style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'8px 12px', border:'1px solid',
                  borderColor: f.selectedCategories.includes(cat) ?
                               '#4F46E5' : '#E5E7EB',
                  borderRadius:8, cursor:'pointer', fontSize:13,
                  background: f.selectedCategories.includes(cat) ?
                                  '#EEF2FF' : 'white',
                  color: f.selectedCategories.includes(cat) ?
                             '#4338CA' : '#374151'
                }}>
                  <input type="checkbox"
                    checked={f.selectedCategories.includes(cat)}
                    onChange={e=>{
                      const next = e.target.checked
                        ? [...f.selectedCategories,cat]
                        : f.selectedCategories.filter(c => c !== cat);
                      set('selectedCategories',next);
                    }}/>
                  {cat}
                </label>
              ))}
            </div>
            {errs.selectedCategories &&
              <p style={err}>{errs.selectedCategories}</p>}
          </div>

          <div style={{marginBottom:0}}>
            <label style={lbl}>
              Product Type <span style={{color:'#EF4444'}}>*</span>
            </label>
            <div style={{display:'flex', flexDirection:'column',
                          gap:8}}>
              {[
                'Raw products (unprocessed)',
                'Finished products (processed)',
                'Both raw and finished'
              ].map(t => (
                <label key={t} style={{ display:'flex',
                  alignItems:'center', gap:8, cursor:'pointer',
                  fontSize:13, color:'#374151',
                  padding:'8px 12px', border:'1px solid',
                  borderColor: f.productType === t ?
                               '#4F46E5' : '#E5E7EB',
                  borderRadius:8,
                  background: f.productType === t ?
                                  '#EEF2FF' : 'white' }}>
                  <input type="radio" name="productType" value={t}
                    checked={f.productType === t}
                    onChange={()=>set('productType',t)}/>
                  {t}
                </label>
              ))}
            </div>
            {errs.productType &&
              <p style={err}>{errs.productType}</p>}
          </div>
        </>
      ))}
    </div>
  );
}

