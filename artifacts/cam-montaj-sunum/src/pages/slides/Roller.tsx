export default function Roller() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#F8FAFB", padding: "6vh 6vw" }}>
      <div style={{ marginBottom: "4vh" }}>
        <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "1.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "3.8vw", color: "#0A1628", lineHeight: 1.1 }}
        >
          Tek Sistem, 3 Rol
        </h2>
        <p className="font-body" style={{ fontSize: "1.6vw", color: "#5E7A9E", marginTop: "1vh" }}>
          Her kullanicinin ihtiyacına gore uyarlanmis ekranlar ve yetkiler
        </p>
      </div>
      <div className="flex gap-[2vw]" style={{ flex: 1, alignItems: "stretch" }}>
        <div
          style={{ flex: 1, background: "#0A1628", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.8vh" }}
        >
          <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "50%", background: "#1E6FE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="font-display font-extrabold" style={{ fontSize: "1.5vw", color: "#fff" }}>A</span>
          </div>
          <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#FFFFFF" }}>Admin</p>
          <div style={{ width: "2.5vw", height: "0.2vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#7AAFD4", lineHeight: 1.6 }}>
            Tum araclari ve personeli gorur
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#7AAFD4", lineHeight: 1.6 }}>
            Istatistik ve raporlara erisir
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#7AAFD4", lineHeight: 1.6 }}>
            Her kusur ve yorumu yonetir
          </p>
        </div>
        <div
          style={{ flex: 1, background: "#EBF2FF", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.8vh" }}
        >
          <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "50%", background: "#1E6FE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="font-display font-extrabold" style={{ fontSize: "1.5vw", color: "#fff" }}>P</span>
          </div>
          <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#0A1628" }}>Personel</p>
          <div style={{ width: "2.5vw", height: "0.2vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#2C4E7A", lineHeight: 1.6 }}>
            Montaj adimlarini ilerletir
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#2C4E7A", lineHeight: 1.6 }}>
            Fotograf ceker ve yukler
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#2C4E7A", lineHeight: 1.6 }}>
            Kusur tespit edince bildirir
          </p>
        </div>
        <div
          style={{ flex: 1, background: "#F1F5FA", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", gap: "1.8vh", border: "0.15vw solid #D1E0F5" }}
        >
          <div style={{ width: "3.5vw", height: "3.5vw", borderRadius: "50%", background: "#1E6FE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="font-display font-extrabold" style={{ fontSize: "1.5vw", color: "#fff" }}>M</span>
          </div>
          <p className="font-display font-bold" style={{ fontSize: "2.2vw", color: "#0A1628" }}>Musteri</p>
          <div style={{ width: "2.5vw", height: "0.2vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.6 }}>
            Aracinin durumunu anlık gorur
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.6 }}>
            Su testi onayini verir
          </p>
          <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.6 }}>
            Kusur bildiriminde bulunur
          </p>
        </div>
      </div>
    </div>
  );
}
