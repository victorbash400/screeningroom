export default function AffinityConnections() {
  return (
    <g stroke="#a5a4a0" strokeWidth=".85" strokeLinecap="round" fill="none">
      {[0, 1].map((layer) => (
        <g key={layer} data-connection-layer>
          {[0, 1, 2].map((index) => (
            <g key={index} data-connection>
              <path data-trunk />
              <path data-branch />
              <path data-branch />
              <circle data-junction r="2.2" fill="#fff" strokeWidth="1" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}
