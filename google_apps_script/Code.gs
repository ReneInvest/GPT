const DOCUMENT_ID = '1Kw8TqFBuDzPknCsW5tRKQRjcTD5JWRchPyC3nE-P5AU';

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    verifyToken_(payload);

    const documentId = payload.document_id || DOCUMENT_ID;
    if (documentId !== DOCUMENT_ID) {
      throw new Error('Unexpected document_id.');
    }

    const content = String(payload.content || '').trim();
    if (!content) {
      throw new Error('Missing content.');
    }

    const result = prependToDocument_(documentId, content);
    return json_({
      ok: true,
      document_id: documentId,
      inserted_heading: result.insertedHeading,
      inserted_at: new Date().toISOString()
    });
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function doGet() {
  return json_({
    ok: true,
    service: 'CASPYAN weekly report Google Docs endpoint',
    document_id: DOCUMENT_ID
  });
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing POST body.');
  }
  return JSON.parse(e.postData.contents);
}

function verifyToken_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  if (!expected) {
    return;
  }
  if (payload.token !== expected) {
    throw new Error('Invalid token.');
  }
}

function prependToDocument_(documentId, content) {
  const doc = DocumentApp.openById(documentId);
  const body = doc.getBody();
  const lines = content.split(/\r?\n/);
  const firstMeaningfulLine = lines.find((line) => line.trim()) || 'Weekly report';

  body.insertHorizontalRule(0);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.trim() === '────────────────────────────') {
      body.insertHorizontalRule(0);
    } else if (line.trim() === '') {
      body.insertParagraph(0, '');
    } else {
      insertFormattedParagraph_(body, line);
    }
  }

  doc.saveAndClose();
  return { insertedHeading: firstMeaningfulLine };
}

function insertFormattedParagraph_(body, line) {
  const headingMatch = line.match(/^\*\*(.+)\*\*$/);
  if (headingMatch) {
    const paragraph = body.insertParagraph(0, headingMatch[1]);
    paragraph.editAsText().setBold(true);
    return;
  }

  const bulletMatch = line.match(/^- (.+)$/);
  if (bulletMatch) {
    const item = body.insertListItem(0, bulletMatch[1]);
    item.setGlyphType(DocumentApp.GlyphType.BULLET);
    item.editAsText().setBold(false);
    return;
  }

  body.insertParagraph(0, line);
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
