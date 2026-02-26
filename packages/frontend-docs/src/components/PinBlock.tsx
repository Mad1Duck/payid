export function PinBlock({ color, lit, small }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: small ? '1.5px' : '2px',
        alignItems: 'center',
      }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: small ? '3px' : '4px',
            height: small ? '7px' : '10px',
            borderRadius: '1px',
            background: lit ? color : '#D0D0D8',
            boxShadow: lit
              ? `0 0 5px ${color}AA,inset 0 1px 0 ${color}FF`
              : 'inset 0 1px 0 #E8E8EC',
            transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      ))}
    </div>
  );
}
