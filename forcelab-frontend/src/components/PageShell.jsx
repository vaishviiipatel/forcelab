function PageShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0f19] px-8 pt-2 pb-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[720px] h-[480px] rounded-full bg-white/[0.09] blur-[110px] top-[2%] left-[-12%] animate-glow-sphere-one" />
        <div className="absolute w-[860px] h-[520px] rounded-full bg-white/[0.08] blur-[125px] top-[28%] right-[-18%] animate-glow-sphere-two" />
        <div className="absolute w-[740px] h-[510px] rounded-full bg-white/[0.07] blur-[115px] bottom-[-8%] left-[12%] animate-glow-sphere-three" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
    </div>
  )
}

export default PageShell
