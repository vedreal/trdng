export function AnimatedBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "linear-gradient(160deg, #0D0900 0%, #120C00 50%, #0A0800 100%)",
      }}
    >
      <div className="anim-orb anim-orb-1" />
      <div className="anim-orb anim-orb-2" />
      <div className="anim-orb anim-orb-3" />
      <div className="anim-orb anim-orb-4" />
      <div className="anim-orb anim-orb-5" />
    </div>
  );
}
