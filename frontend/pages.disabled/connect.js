import { useState, useEffect } from 'react';

export default function ConnectStatus() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    fetch('/api/connect')
      .then(response => response.json())
      .then(data => setStatus(data.status))
      .catch(error => setStatus('Error: ' + error.message));
  }, []);

  return (
    <div>
      <h1>Connection Status</h1>
      <p>{status}</p>
    </div>
  );
}