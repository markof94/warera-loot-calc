const PulsingDot = () => {
  return (
    <div className="relative">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
    </div>
  );
};

export default PulsingDot;
