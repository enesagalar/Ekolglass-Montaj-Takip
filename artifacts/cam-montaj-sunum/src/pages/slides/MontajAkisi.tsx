export default function MontajAkisi() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0A1628" }}>
      <div
        className="absolute"
        style={{ top: 0, right: 0, width: "35vw", height: "100vh", background: "linear-gradient(135deg, #1E3A6E 0%, #0A1628 100%)", opacity: 0.5 }}
      />
      <div className="relative z-10 flex flex-col justify-center h-full" style={{ padding: "0 7vw" }}>
        <div style={{ marginBottom: "5vh" }}>
          <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "1.5vh" }} />
          <h2
            className="font-display font-extrabold tracking-tight"
            style={{ fontSize: "3.8vw", color: "#FFFFFF", lineHeight: 1.1 }}
          >
            Montaj Akisi
          </h2>
          <p className="font-body" style={{ fontSize: "1.6vw", color: "#7AAFD4", marginTop: "1vh" }}>
            Aracin fabrikadan teslime kadar izledigi yol
          </p>
        </div>
        <div className="flex items-start" style={{ gap: "0" }}>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div
              style={{ width: "4.5vw", height: "4.5vw", borderRadius: "50%", background: "#1E6FE8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5vh" }}
            >
              <span className="font-display font-extrabold" style={{ fontSize: "2vw", color: "#fff" }}>1</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "1.7vw", color: "#FFFFFF", marginBottom: "0.8vh" }}>Kayit</p>
            <p className="font-body text-center" style={{ fontSize: "1.4vw", color: "#7AAFD4", lineHeight: 1.5 }}>
              Sasi no ve marka girilir
            </p>
          </div>
          <div style={{ flex: 0.4, height: "0.25vh", background: "#1E4A8E", marginTop: "2.25vw", borderRadius: "999px" }} />
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div
              style={{ width: "4.5vw", height: "4.5vw", borderRadius: "50%", background: "#1E4A8E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5vh" }}
            >
              <span className="font-display font-extrabold" style={{ fontSize: "2vw", color: "#fff" }}>2</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "1.7vw", color: "#FFFFFF", marginBottom: "0.8vh" }}>On Fotograf</p>
            <p className="font-body text-center" style={{ fontSize: "1.4vw", color: "#7AAFD4", lineHeight: 1.5 }}>
              Montaj oncesi cam durumu
            </p>
          </div>
          <div style={{ flex: 0.4, height: "0.25vh", background: "#1E4A8E", marginTop: "2.25vw", borderRadius: "999px" }} />
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div
              style={{ width: "4.5vw", height: "4.5vw", borderRadius: "50%", background: "#1E4A8E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5vh" }}
            >
              <span className="font-display font-extrabold" style={{ fontSize: "2vw", color: "#fff" }}>3</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "1.7vw", color: "#FFFFFF", marginBottom: "0.8vh" }}>Montaj</p>
            <p className="font-body text-center" style={{ fontSize: "1.4vw", color: "#7AAFD4", lineHeight: 1.5 }}>
              Cam takilir, sonrasi fotograf
            </p>
          </div>
          <div style={{ flex: 0.4, height: "0.25vh", background: "#1E4A8E", marginTop: "2.25vw", borderRadius: "999px" }} />
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div
              style={{ width: "4.5vw", height: "4.5vw", borderRadius: "50%", background: "#1E4A8E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5vh" }}
            >
              <span className="font-display font-extrabold" style={{ fontSize: "2vw", color: "#fff" }}>4</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "1.7vw", color: "#FFFFFF", marginBottom: "0.8vh" }}>Su Testi</p>
            <p className="font-body text-center" style={{ fontSize: "1.4vw", color: "#7AAFD4", lineHeight: 1.5 }}>
              Musteri onaylar veya reddeder
            </p>
          </div>
          <div style={{ flex: 0.4, height: "0.25vh", background: "#1E4A8E", marginTop: "2.25vw", borderRadius: "999px" }} />
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <div
              style={{ width: "4.5vw", height: "4.5vw", borderRadius: "50%", background: "#14532D", border: "0.15vw solid #22C55E", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5vh" }}
            >
              <span className="font-display font-extrabold" style={{ fontSize: "2vw", color: "#22C55E" }}>5</span>
            </div>
            <p className="font-display font-bold text-center" style={{ fontSize: "1.7vw", color: "#22C55E", marginBottom: "0.8vh" }}>Tamamlandi</p>
            <p className="font-body text-center" style={{ fontSize: "1.4vw", color: "#7AAFD4", lineHeight: 1.5 }}>
              Kayit arsive gecer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
