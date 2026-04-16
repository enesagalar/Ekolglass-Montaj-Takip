export default function Kapanis() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#F8FAFB" }}>
      <div
        className="absolute"
        style={{ top: 0, left: 0, width: "100%", height: "0.6vh", background: "linear-gradient(90deg, #1E6FE8, #5EB0FF, #1E6FE8)" }}
      />
      <div
        className="absolute"
        style={{ bottom: 0, right: 0, width: "40vw", height: "40vh", background: "radial-gradient(ellipse at 80% 100%, #EBF2FF 0%, transparent 70%)", zIndex: 0 }}
      />
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={{ flex: 1, padding: "0 8vw" }}
      >
        <div style={{ width: "4vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "3.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight text-center"
          style={{ fontSize: "5vw", color: "#0A1628", lineHeight: 1.1, marginBottom: "2vh" }}
        >
          Ekolglass Montaj Takip
        </h2>
        <p
          className="font-body text-center"
          style={{ fontSize: "2vw", color: "#1E6FE8", fontWeight: 600, marginBottom: "4.5vh" }}
        >
          Her arac. Her cam. Her adim. Kayit altinda.
        </p>
        <div
          style={{ display: "flex", gap: "3vw", alignItems: "center" }}
        >
          <div style={{ textAlign: "center" }}>
            <p className="font-display font-semibold" style={{ fontSize: "1.5vw", color: "#5E7A9E" }}>Sunucu</p>
            <p className="font-body font-medium" style={{ fontSize: "1.8vw", color: "#0A1628" }}>46.225.233.65</p>
          </div>
          <div style={{ width: "0.15vw", height: "4vh", background: "#D1E0F5", borderRadius: "999px" }} />
          <div style={{ textAlign: "center" }}>
            <p className="font-display font-semibold" style={{ fontSize: "1.5vw", color: "#5E7A9E" }}>Expo Go</p>
            <p className="font-body font-medium" style={{ fontSize: "1.8vw", color: "#0A1628" }}>exp://46.225.233.65:8081</p>
          </div>
          <div style={{ width: "0.15vw", height: "4vh", background: "#D1E0F5", borderRadius: "999px" }} />
          <div style={{ textAlign: "center" }}>
            <p className="font-display font-semibold" style={{ fontSize: "1.5vw", color: "#5E7A9E" }}>Musteri</p>
            <p className="font-body font-medium" style={{ fontSize: "1.8vw", color: "#0A1628" }}>ISRI</p>
          </div>
        </div>
      </div>
      <div
        style={{ background: "#0A1628", padding: "2.5vh 6vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span className="font-display font-bold" style={{ fontSize: "1.6vw", color: "#FFFFFF" }}>Ekolglass</span>
        <span className="font-body" style={{ fontSize: "1.4vw", color: "#5E7A9E" }}>Cam Montaj Takip Sistemi &mdash; 2026</span>
        <span className="font-display font-semibold" style={{ fontSize: "1.6vw", color: "#1E6FE8" }}>ISRI</span>
      </div>
    </div>
  );
}
