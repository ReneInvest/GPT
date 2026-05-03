const DOCUMENT_ID = '1eW9_WvxoMLeDgUXe8nsQIQlxMLBXgnhe73539ivZNJM';
const TOKEN_PROPERTY = 'FUNDRAISING_AGENT_TOKEN';

function doGet(e) {
  try {
    return json_({
      ok: true,
      service: 'fundraising-agent-doc-writer',
      documentId: DOCUMENT_ID,
      tokenRequired: Boolean(getToken_())
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    assertToken_(payload.token);

    if (payload.action === 'read' || payload.action === 'history') {
      return json_({
        ok: true,
        documentId: DOCUMENT_ID,
        text: readDocument_(Number(payload.maxChars || 50000))
      });
    }

    const content = String(payload.content || '').trim();
    if (!content) {
      throw new Error('Missing required field: content');
    }

    const result = appendReport_(content);
    return json_({
      ok: true,
      documentId: DOCUMENT_ID,
      appendedCharacters: content.length,
      appendedAt: result.appendedAt
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function appendReport_(content) {
  const doc = DocumentApp.openById(DOCUMENT_ID);
  const body = doc.getBody();

  if (body.getText().trim()) {
    body.appendPageBreak();
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line) => appendLine_(body, line));

  const appendedAt = new Date().toISOString();
  doc.saveAndClose();

  return { appendedAt };
}

function readDocument_(maxChars) {
  const doc = DocumentApp.openById(DOCUMENT_ID);
  const text = doc.getBody().getText();
  const safeMaxChars = Math.max(1000, Math.min(maxChars || 50000, 200000));
  return text.slice(Math.max(0, text.length - safeMaxChars));
}

function appendLine_(body, rawLine) {
  const line = String(rawLine || '').trimEnd();

  if (!line.trim()) {
    body.appendParagraph('');
    return;
  }

  if (/^[-*]\s+/.test(line)) {
    const item = body.appendListItem(line.replace(/^[-*]\s+/, ''));
    item.setGlyphType(DocumentApp.GlyphType.BULLET);
    item.setBold(false);
    return;
  }

  const headingMatch = line.match(/^\*\*(.+)\*\*$/);
  if (headingMatch) {
    const paragraph = body.appendParagraph(headingMatch[1]);
    paragraph.setBold(true);
    paragraph.setSpacingBefore(10);
    paragraph.setSpacingAfter(4);
    return;
  }

  appendRichParagraph_(body, line);
}

function appendRichParagraph_(body, line) {
  const paragraph = body.appendParagraph(line.replace(/\*\*/g, ''));
  const text = paragraph.editAsText();
  text.setBold(false);

  let removedMarkers = 0;
  const markerRegex = /\*\*/g;
  const markers = [];
  let match;
  while ((match = markerRegex.exec(line)) !== null) {
    markers.push(match.index - removedMarkers);
    removedMarkers += 2;
  }

  for (let index = 0; index + 1 < markers.length; index += 2) {
    const start = markers[index];
    const end = markers[index + 1] - 1;
    if (start <= end) {
      text.setBold(start, end, true);
    }
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing JSON request body');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('Request body must be valid JSON');
  }
}

function assertToken_(receivedToken) {
  const expectedToken = getToken_();
  if (!expectedToken) {
    throw new Error('Server token is not configured. Set Script property FUNDRAISING_AGENT_TOKEN.');
  }

  if (String(receivedToken || '') !== expectedToken) {
    throw new Error('Invalid token');
  }
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
