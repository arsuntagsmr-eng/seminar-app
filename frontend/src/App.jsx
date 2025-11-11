import React, { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [form, setForm] = useState({ nama:'', nim:'', prodi:'', dosen:'', judul:'', tanggal:'' });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken')||'');
  const [participants, setParticipants] = useState([]);
  const [query, setQuery] = useState('');
  const fileRef = useRef();

  useEffect(()=> {
    if (adminToken) fetchParticipants();
  }, [adminToken]);

  function handleChange(e){ setForm({...form, [e.target.name]: e.target.value}); }
  function handleFile(e){ setFile(e.target.files[0]); }

  async function submit(e){
    e.preventDefault();
    if(!form.nama || !form.nim || !form.judul){ setMsg({type:'error', text:'Isi nama, NIM, judul'}); return; }
    if(!/^\d{8,12}$/.test(form.nim)){ setMsg({type:'error', text:'Format NIM 8-12 digit.'}); return; }
    const fd = new FormData();
    Object.keys(form).forEach(k=> fd.append(k, form[k]));
    if(file) fd.append('berkas', file);
    try {
      const res = await fetch(API + '/api/register', { method:'POST', body: fd });
      const j = await res.json();
      if(!res.ok){ setMsg({type:'error', text: j.error || 'Gagal daftar'}); return; }
      setMsg({type:'success', text:'Pendaftaran berhasil!'});
      setForm({ nama:'', nim:'', prodi:'', dosen:'', judul:'', tanggal:'' });
      setFile(null); if(fileRef.current) fileRef.current.value='';
    } catch(err){ setMsg({type:'error', text:'Network error'}); }
  }

  async function adminLogin(e){
    e.preventDefault();
    const password = e.target.password.value;
    try{
      const res = await fetch(API + '/api/admin/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ password })
      });
      const j = await res.json();
      if(!res.ok){ setMsg({type:'error', text: j.error || 'Login failed'}); return; }
      localStorage.setItem('adminToken', j.token);
      setAdminToken(j.token);
      setMsg({type:'success', text:'Admin login berhasil'});
      e.target.reset();
    } catch(e){ setMsg({type:'error', text:'Network error'}); }
  }

  async function fetchParticipants(){
    try{
      const res = await fetch(API + '/api/participants', { headers:{ Authorization: 'Bearer ' + adminToken }});
      if(!res.ok){ setMsg({type:'error', text:'Tidak bisa mengambil peserta'}); return; }
      const j = await res.json();
      setParticipants(j);
    }catch(e){ setMsg({type:'error', text:'Network error'}); }
  }

  async function handleDelete(id){
    if(!confirm('Hapus peserta ini?')) return;
    try{
      const res = await fetch(API + '/api/participants/' + id, { method:'DELETE', headers:{ Authorization: 'Bearer ' + adminToken }});
      if(!res.ok){ setMsg({type:'error', text:'Gagal hapus'}); return; }
      setParticipants(prev => prev.filter(p=>p.id!==id));
      setMsg({type:'success', text:'Terhapus'});
    }catch(e){ setMsg({type:'error', text:'Network error'}); }
  }

  function exportCSV(){
    if(participants.length === 0) { setMsg({type:'info', text:'Belum ada peserta'}); return; }
    const headers = ['id','nama','nim','prodi','dosen','judul','tanggal','berkas','waktuDaftar'];
    const rows = participants.map(p => headers.map(h => JSON.stringify(p[h]||'')).join(','));
    const csv = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'peserta.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const filtered = participants.filter(p => {
    const q = query.toLowerCase();
    return p.nama.toLowerCase().includes(q) || p.nim.includes(q) || (p.prodi||'').toLowerCase().includes(q);
  });

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:22, marginBottom:12}}>Pendaftaran Seminar Skripsi</h1>
      {msg && <div style={{marginBottom:12, padding:8, background: msg.type==='error' ? '#fee2e2' : '#bbf7d0'}}>{msg.text}</div>}
      <div style={{display:'flex', gap:20}}>
        <form onSubmit={submit} style={{flex:1, background:'#fff', padding:16, borderRadius:8}}>
          <h2>Form Pendaftaran</h2>
          <input name="nama" placeholder="Nama lengkap" value={form.nama} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} />
          <input name="nim" placeholder="NIM" value={form.nim} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} />
          <input name="prodi" placeholder="Program Studi" value={form.prodi} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} />
          <input name="dosen" placeholder="Dosen Pembimbing" value={form.dosen} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} />
          <textarea name="judul" placeholder="Judul Skripsi" value={form.judul} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} rows={3} />
          <input name="tanggal" type="date" value={form.tanggal} onChange={handleChange} style={{width:'100%',padding:8,marginTop:8}} />
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} style={{marginTop:8}} />
          <div style={{marginTop:12, display:'flex', gap:8}}>
            <button type="submit" style={{padding:'8px 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:4}}>Daftar</button>
            <button type="button" onClick={()=>{ setForm({ nama:'', nim:'', prodi:'', dosen:'', judul:'', tanggal:'' }); setFile(null); if(fileRef.current) fileRef.current.value=''; }} style={{padding:'8px 12px'}}>Reset</button>
          </div>
        </form>

        <div style={{width:420, background:'#fff', padding:16, borderRadius:8}}>
          <h2>Admin</h2>
          {!adminToken ? (
            <form onSubmit={adminLogin}>
              <input name="password" placeholder="Password admin" style={{width:'100%',padding:8,marginTop:8}} />
              <div style={{marginTop:8}}>
                <button style={{padding:'8px 12px', background:'#111827', color:'#fff', border:'none', borderRadius:4}}>Masuk</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <input placeholder="Cari nama / NIM / prodi" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1,padding:8}} />
                <button onClick={exportCSV} style={{padding:'6px 8px'}}>Ekspor CSV</button>
                <button onClick={()=>{ localStorage.removeItem('adminToken'); setAdminToken(''); setParticipants([]); }} style={{padding:'6px 8px'}}>Keluar</button>
              </div>
              <div style={{maxHeight:300, overflow:'auto'}}>
                <table style={{width:'100%', fontSize:12}}>
                  <thead><tr style={{borderBottom:'1px solid #e5e7eb'}}><th>Nama</th><th>NIM</th><th>Prodi</th><th>Judul</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} style={{borderBottom:'1px solid #efefef'}}>
                        <td style={{padding:8}}>{p.nama}<div style={{fontSize:11,color:'#6b7280'}}>{new Date(p.waktuDaftar).toLocaleString()}</div></td>
                        <td style={{padding:8}}>{p.nim}</td>
                        <td style={{padding:8}}>{p.prodi}</td>
                        <td style={{padding:8}}>{p.judul}</td>
                        <td style={{padding:8}}><button onClick={()=>handleDelete(p.id)} style={{padding:'4px 6px'}}>Hapus</button></td>
                      </tr>
                    ))}
                    {filtered.length===0 && <tr><td colSpan={5} style={{padding:12,color:'#6b7280'}}>Belum ada peserta</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// helper to keep handleChange reference
function handleChange(e){ /* placeholder to avoid lint error when copy-paste; real handler is inside component */ }
