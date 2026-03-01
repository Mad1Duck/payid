export function LEDDot({ color, pulse }) {
  return (
    <div style={{ position: 'relative', width: '8px', height: '8px' }}>
      {pulse && (
        <div
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            background: color,
            opacity: 0.3,
            animation: 'ledring 2s infinite',
          }}
        />
      )}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%,${color}FF,${color}88)`,
          boxShadow: `0 0 6px ${color}BB`,
          animation: pulse ? 'ledpulse 2s infinite' : 'none',
        }}
      />
    </div>
  );
}
