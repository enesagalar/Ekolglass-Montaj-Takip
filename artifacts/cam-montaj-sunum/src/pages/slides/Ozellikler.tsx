export default function Ozellikler() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#F8FAFB", padding: "5.5vh 6.5vw" }}>
      <div style={{ marginBottom: "3.5vh" }}>
        <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "1.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "3.8vw", color: "#0A1628", lineHeight: 1.1 }}
        >
          Temel Ozellikler
        </h2>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "2vh 2vw", flex: 1 }}>
        <div style={{ background: "#EBF2FF", borderRadius: "1vw", padding: "3vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
          <div style={{ width: "3vw", height: "0.35vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-display font-bold" style={{ fontSize: "2vw", color: "#0A1628" }}>Fotograf Takibi</p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#2C4E7A", lineHeight: 1.6 }}>
            On, arka, soluk montaj ve onay belgeleri Cloudflare R2'de guvenle saklanir. Sasi numarasi ile anlık erisim.
          </p>
        </div>
        <div style={{ background: "#0A1628", borderRadius: "1vw", padding: "3vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
          <div style={{ width: "3vw", height: "0.35vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-display font-bold" style={{ fontSize: "2vw", color: "#FFFFFF" }}>Kusur Bildirimi</p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#7AAFD4", lineHeight: 1.6 }}>
            Personel veya musteri kusur bildirir, fotograf ekler. Admin her iki tarafi da gorebilir.
          </p>
        </div>
        <div style={{ background: "#F1F5FA", borderRadius: "1vw", padding: "3vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.2vh", border: "0.15vw solid #D1E0F5" }}>
          <div style={{ width: "3vw", height: "0.35vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-display font-bold" style={{ fontSize: "2vw", color: "#0A1628" }}>Canlı Durum</p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.6 }}>
            ISRI musteri, araclarin hangi adimda oldugunu anlık gorebilir. Bekleme belirsizligi sona erdi.
          </p>
        </div>
        <div style={{ background: "#F1F5FA", borderRadius: "1vw", padding: "3vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.2vh", border: "0.15vw solid #D1E0F5" }}>
          <div style={{ width: "3vw", height: "0.35vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-display font-bold" style={{ fontSize: "2vw", color: "#0A1628" }}>Sasi Arama</p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.6 }}>
            Sasi numarasinin son 5 hanesiyle anlık filtreleme. Tum fotograflar tek ekranda.
          </p>
        </div>
      </div>
    </div>
  );
}
