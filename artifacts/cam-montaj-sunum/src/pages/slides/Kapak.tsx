const base = import.meta.env.BASE_URL;

export default function Kapak() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0A1628" }}>
      <img
        src={`${base}hero-install.png`}
        crossOrigin="anonymous"
        alt="Cam montaj sahnesi"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(105deg, rgba(10,22,40,0.97) 42%, rgba(10,22,40,0.55) 100%)" }}
      />
      <div className="relative z-10 flex flex-col justify-center h-full" style={{ paddingLeft: "8vw", paddingRight: "10vw" }}>
        <div className="flex items-center gap-[1.2vw]" style={{ marginBottom: "3vh" }}>
          <div style={{ width: "3.5vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <span
            className="font-body font-medium tracking-widest uppercase"
            style={{ fontSize: "1.3vw", color: "#5E9EF5", letterSpacing: "0.2em" }}
          >
            Ekolglass &times; ISRI
          </span>
        </div>
        <h1
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "6.5vw", color: "#FFFFFF", lineHeight: 1.05, maxWidth: "18ch" }}
        >
          Cam Montaj
        </h1>
        <h1
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "6.5vw", color: "#5EB0FF", lineHeight: 1.05, marginBottom: "3vh" }}
        >
          Takip
        </h1>
        <p
          className="font-body font-medium"
          style={{ fontSize: "1.9vw", color: "#A8C8F0", maxWidth: "36ch", lineHeight: 1.5 }}
        >
          Saha, yönetim ve müşteri — montaj sürecini uçtan uca kontrol edin.
        </p>
        <div
          className="flex items-center gap-[2vw]"
          style={{ marginTop: "5vh" }}
        >
          <div style={{ width: "0.25vw", height: "5vh", background: "#1E6FE8", borderRadius: "999px" }} />
          <div>
            <p className="font-body font-medium" style={{ fontSize: "1.5vw", color: "#7AAFD4" }}>4 Araç Markası</p>
            <p className="font-body font-medium" style={{ fontSize: "1.5vw", color: "#7AAFD4" }}>8 Cam Pozisyonu</p>
          </div>
          <div style={{ width: "0.25vw", height: "5vh", background: "#1E6FE8", borderRadius: "999px", marginLeft: "1vw" }} />
          <div>
            <p className="font-body font-medium" style={{ fontSize: "1.5vw", color: "#7AAFD4" }}>Fotoğraf Takibi</p>
            <p className="font-body font-medium" style={{ fontSize: "1.5vw", color: "#7AAFD4" }}>Kusur Bildirimi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
