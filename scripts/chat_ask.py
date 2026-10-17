"""Ask the live website chatbot (Edge Function site-chat) questions, the way the bubble does.

    python -X utf8 scripts/chat_ask.py en "How much does it cost?" "I am ready, how do I start?"
    python -X utf8 scripts/chat_ask.py fa "هزینه‌ش چقدره؟"

Every question after the site is one turn of ONE conversation (so follow-ups see the earlier ones).
Each run is saved like a real chat with page '/test', so delete them afterwards (the /chat-facts skill
says how) or they show up in coach.html → Leads → Chats and count towards the 8-chats-a-day limit.
Prints each reply and its handoff button. Whether a reply was flagged as a gap is not sent to the page:
read chat_messages.gap with SQL (the skill has the query).
"""
import json
import sys
import urllib.request

URL = 'https://bvipfipbdcyqnbczjmaq.supabase.co/functions/v1/site-chat'
KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy'   # the publishable key, public by design (it is on every page)


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ('en', 'fa'):
        sys.exit(__doc__)
    site, questions = sys.argv[1], sys.argv[2:]
    cid = None
    for q in questions:
        body = {'site': site, 'message': q, 'page': '/test'}
        if cid:
            body['conversation_id'] = cid
        req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
            'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json',
            'Origin': 'https://www.amirardekani.com'})
        r = json.load(urllib.request.urlopen(req, timeout=60))
        cid = r.get('conversation_id') or cid
        flags = [f'button={r.get("handoff")}']
        if r.get('offline'):
            flags.append('OFFLINE (no key, spend cap reached, or a database error: read the function logs)')
        if r.get('limit'):
            flags.append('LIMIT (8 chats a day per visitor, or 20 turns: delete the /test chats)')
        print(f'[{site}] Q: {q}\n     A: {r.get("reply")}\n     {" · ".join(flags)}\n')
    print('conversation:', cid)


if __name__ == '__main__':
    main()
