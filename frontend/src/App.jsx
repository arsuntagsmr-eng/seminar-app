import React, { useState } from "react";

const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || "";

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    nama: "",
    nim: "",
    prodi: "",
    dosen: "",
    judul: "",
    tanggal: "",
    berkasName: "",
    email: ""
  });

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function next() {
    if (step === 1) {
      if (!form.nama || !/^\d{8,12}$/.test(form.nim) || !form.prodi) {
        setMsg({ type: "error", text: "Isi Nama, NIM (8-12 digit), Program Studi" });
        return;
      }
    }
    setMsg(null);
    setStep(s => Math.min(4, s + 1));
  }

  function back() {
    setMsg(null);
    setStep(s => Math.max(1, s - 1));
  }

  async function submit() {
    if (!SHEETS_URL) {
      setMsg({ type: "error", text: "Belum ada endpoint Google Sheets (VITE_SHEETS_URL belum diset)." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      // build payload
      const payload = { ...form };

      const res = await fetch(SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (j && j.ok) {
        setMsg({ type: "success", text: "Pendaftaran berhasil! Terima kasih." });
        setStep(4);
      } else {
        setMsg({ type: "error", text: "Gagal mengirim. Coba lagi." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui,Segoe UI,Roboto" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", background: "#fff", padding: 20, borderRadius: 8 }}>
        <h1 style={{ marginBottom: 8 }}>Pendaftaran Seminar Skripsi</h1>
        <p style={{ marginTop: 0, color: "#666" }}>Form multi-step — isi langkah per langkah</p>

        {msg && (
          <div style={{ marginBottom: 12, padding: 10, background: msg.type === "error" ? "#fee2e2" : "#ecfdf5", color: msg.type === "error" ? "#9b1c1c" : "#065f46" }}>
            {msg.text}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3>Langkah 1 — Data Pribadi</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input placeholder="Nama lengkap" value={form.nama} onChange={e => update("nama", e.target.value)} />
              <input placeholder="NIM (8-12 digit)" value={form.nim} onChange={e => update("nim", e.target.value)} />
              <input placeholder="Program Studi" value={form.prodi} onChange={e => update("prodi", e.target.value)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={next}>Lanjut</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Langkah 2 — Info Akademik</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input placeholder="Dosen Pembimbing" value={form.dosen} onChange={e => update("dosen", e.target.value)} />
              <textarea placeholder="Judul Skripsi" value={form.judul} onChange={e => update("judul", e.target.value)} rows={4} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={back} style={{ marginRight: 8 }}>Kembali</button>
              <button onClick={next}>Lanjut</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Langkah 3 — Jadwal & Berkas</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input type="date" value={form.tanggal} onChange={e => update("tanggal", e.target.value)} />
              <input placeholder="Nama file PDF (opsional)" value={form.berkasName} onChange={e => update("berkasName", e.target.value)} />
              <input placeholder="Email (opsional, untuk konfirmasi)" value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={back} style={{ marginRight: 8 }}>Kembali</button>
              <button onClick={next}>Lanjut ke Kirim</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3>Konfirmasi & Kirim</h3>
            <div style={{ background: "#fafafa", padding: 12, borderRadius: 6 }}>
              <div><strong>Nama:</strong> {form.nama}</div>
              <div><strong>NIM:</strong> {form.nim}</div>
              <div><strong>Prodi:</strong> {form.prodi}</div>
              <div><strong>Dosen:</strong> {form.dosen}</div>
              <div><strong>Judul:</strong> {form.judul}</div>
              <div><strong>Tanggal:</strong> {form.tanggal}</div>
              <div><strong>Berkas (nama):</strong> {form.berkasName}</div>
              <div><strong>Email:</strong> {form.email}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={back} style={{ marginRight: 8 }}>Kembali</button>
              <button onClick={submit} disabled={loading}>{loading ? "Mengirim..." : "Kirim Pendaftaran"}</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
          <small>Catatan: Saat ini berkas tidak diupload — hanya nama file yang dicatat. Untuk menyimpan file (PDF) ke Drive, saya bisa tambahkan integrasi Drive bila mau.</small>
        </div>
      </div>
    </div>
  );
}
