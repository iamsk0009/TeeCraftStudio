function LoadingScreen() {
  return (
    <div className='absolute inset-0 z-60 bg-white/50 backdrop-blur-md flex justify-center items-center'>
      <div className='py-6 px-10 bg-white rounded-xl shadow-xl flex  items-center gap-10'>
        <div className='w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin'></div>
        <p className='text-xl  '>Building Model...</p>
      </div>
    </div>
  )
}

export default LoadingScreen