export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>License Authority Server</h1>
      <p>Cryptographic license enforcement and revenue split authority.</p>
      <p>
        Colony status: <a href="/api/colony/health">/api/colony/health</a>
      </p>
    </main>
  )
}
