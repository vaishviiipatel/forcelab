function GameCard({ displayTitle, previewAsset, handleLaunch }) {
  return (
    <div
      onClick={handleLaunch}
      onKeyDown={(keyStroke) => keyStroke.code === 'Enter' && handleLaunch()}
      role="button"
      tabIndex={0}
      className="group animated-border-card cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
    >
      <div className="relative bg-transparent backdrop-blur-md rounded-[26px] p-5 w-full flex flex-col items-center">
        <div className="w-full aspect-video rounded-[20px] overflow-hidden border border-white/20 group-hover:border-white transition-colors duration-200">
          <img
            src={previewAsset}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </div>
        <h3 className="font-rajdhani font-semibold text-[28px] text-white mt-5 text-center tracking-wide">
          {displayTitle}
        </h3>
      </div>
    </div>
  )
}

export default GameCard
