const base = import.meta.env.BASE_URL;

export default function FotografKusur() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#F8FAFB" }}>
      <div
        className="flex flex-col justify-center"
        style={{ width: "50%", padding: "0 5vw 0 6.5vw", borderRight: "0.15vw solid #D1E0F5" }}
      >
        <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "2.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "3vw", color: "#0A1628", lineHeight: 1.1, marginBottom: "2vh" }}
        >
          Fotograf Yonetimi
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.2vh" }}>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#1E6FE8", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#0A1628" }}>8 Pozisyon</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#5E7A9E" }}>On cam, arka, soluk ve 5 yan pozisyon desteklenir</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#1E6FE8", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#0A1628" }}>Sasi Bazli Isimlendirme</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#5E7A9E" }}>R2'de VIN + tip + zaman damgasiyla kaydedilir</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#1E6FE8", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#0A1628" }}>Kusur Filtresi</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#5E7A9E" }}>Fotograf sekmesinde "Kusur" filtresiyle anlık erisim</p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex flex-col justify-center"
        style={{ width: "50%", padding: "0 5.5vw 0 4vw", background: "#0A1628" }}
      >
        <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "2.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "3vw", color: "#FFFFFF", lineHeight: 1.1, marginBottom: "2vh" }}
        >
          Kusur Sistemi
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.2vh" }}>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#5EB0FF", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#FFFFFF" }}>Her Durum Serbest</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#7AAFD4" }}>Montaj oncesi, sirasi veya sonrasinda kusur bildirilebilir</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#5EB0FF", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#FFFFFF" }}>Rol Rozeti</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#7AAFD4" }}>Admin ekraninda "Musteri" ve "Personel" etiketleri gorulur</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", height: "100%", minHeight: "4vh", background: "#5EB0FF", borderRadius: "999px", flexShrink: 0 }} />
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.7vw", color: "#FFFFFF" }}>Fotograf Eki</p>
              <p className="font-body" style={{ fontSize: "1.45vw", color: "#7AAFD4" }}>Her kusur bildirimine kanit fotografi eklenebilir</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
