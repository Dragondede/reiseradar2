module.exports = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'ReiseRadar API läuft!' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY fehlt. Bitte in Vercel Environment Variables eintragen.' });
  }

  var prompt = '';
  if (req.body && req.body.prompt) {
    prompt = req.body.prompt;
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Kein Prompt angegeben.' });
  }

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      return res.status(400).json({ error: data.error.message || 'Claude API Fehler' });
    }
    var text = '';
    if (data.content) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].text) {
          text = text + data.content[i].text;
        }
      }
    }
    return res.status(200).json({ text: text || 'Keine Ergebnisse.' });
  })
  .catch(function(e) {
    return res.status(500).json({ error: 'Fehler: ' + e.message });
  });
};
