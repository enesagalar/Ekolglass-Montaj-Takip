export default function Sorun() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#F8FAFB" }}>
      <div
        className="flex flex-col justify-center"
        style={{ width: "42%", background: "#0A1628", padding: "0 5vw" }}
      >
        <div style={{ width: "3vw", height: "0.3vh", background: "#1E6FE8", borderRadius: "999px", marginBottom: "2.5vh" }} />
        <h2
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: "4vw", color: "#FFFFFF", lineHeight: 1.1, marginBottom: "2vh" }}
        >
          Eski Yöntem
        </h2>
        <p
          className="font-body"
          style={{ fontSize: "1.6vw", color: "#7AAFD4", lineHeight: 1.65 }}
        >
          Kağıt formlar, kayıp fotoğraflar ve müşteriye sıfır görünürlük.
        </p>
      </div>
      <div
        className="flex flex-col justify-center"
        style={{ width: "58%", padding: "0 5vw 0 4vw" }}
      >
        <p
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: "2.4vw", color: "#0A1628", marginBottom: "4vh" }}
        >
          Ne kaybediliyordu?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.8vh" }}>
          <div className="flex items-start gap-[1.2vw]">
            <div
              style={{ minWidth: "3.2vw", height: "3.2vw", borderRadius: "50%", background: "#EBF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#1E6FE8" }}>1</span>
            </div>
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.8vw", color: "#0A1628" }}>Kanıtsız Teslim</p>
              <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.5 }}>
                Montaj öncesi ve sonrası fotoğraf yoktu; anlaşmazlık çözümü imkansızdı.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div
              style={{ minWidth: "3.2vw", height: "3.2vw", borderRadius: "50%", background: "#EBF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#1E6FE8" }}>2</span>
            </div>
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.8vw", color: "#0A1628" }}>Kör Müşteri</p>
              <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.5 }}>
                ISRI, araçların hangi aşamada olduğunu anlık takip edemiyordu.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div
              style={{ minWidth: "3.2vw", height: "3.2vw", borderRadius: "50%", background: "#EBF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#1E6FE8" }}>3</span>
            </div>
            <div>
              <p className="font-display font-semibold" style={{ fontSize: "1.8vw", color: "#0A1628" }}>Kayıt Kaybı</p>
              <p className="font-body" style={{ fontSize: "1.5vw", color: "#5E7A9E", lineHeight: 1.5 }}>
                Şasi bazlı geçmiş yoktu; kusur geçmişine erişmek mümkün değildi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
