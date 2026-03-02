export function RuleIcon({ icon, size = 18 }) {
  if (icon?.startsWith('data:'))
    return (
      <img
        src={icon}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: '4px',
          display: 'block',
        }}
        alt=""
      />
    );
  return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
}
