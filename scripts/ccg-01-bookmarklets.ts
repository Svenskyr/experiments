// deno-fmt-ignore
// javascript:(function(){const r=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);const pid=r(),sid=r();location.href=`http://localhost:5173/experiments/ccg-01?study_id=ccg-01&platform=test-pass&pid=${encodeURIComponent(pid)}&p_session_id=${encodeURIComponent(sid)}&role=participant`})();

// javascript: (function(){const randomId=()=>crypto.randomUUID?.()??Math.random().toString(36).slice(2)+Date.now().toString(36);const randomNames=["Alice","Bob","Charlie","Dave","Eve","Frank","George","Hannah","Isaac","James","Kate","Liam","Mia","Noah","Olivia","Patrick","Quinn","Ryan","Sarah","Thomas","Uma","Victoria","William","Xavier","Yasmine","Zachary"];const pid=`${randomNames[Math.floor(Math.random()*randomNames.length)]}-${;Math.floor(Math.random()*100)}`;const pSessionId=randomId();location.href=`http://localhost:5173/experiments/ccg-01`+`?study_id=ccg-01`+`&platform=test-pass`+`&pid=${encodeURIComponent(pid)}`+`&p_session_id=${encodeURIComponent(pSessionId)}`+`&role=participant`})();
const ccg01Participant = () => {
    javascript: (function () {
        const randomId = () =>
            crypto.randomUUID?.()
                ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

        const randomNames = [
            "Alice",
            "Bob",
            "Charlie",
            "Dave",
            "Eve",
            "Frank",
            "George",
            "Hannah",
            "Isaac",
            "James",
            "Kate",
            "Liam",
            "Mia",
            "Noah",
            "Olivia",
            "Patrick",
            "Quinn",
            "Ryan",
            "Sarah",
            "Thomas",
            "Uma",
            "Victoria",
            "William",
            "Xavier",
            "Yasmine",
            "Zachary",
        ];
        
        const pid = `${randomNames[Math.floor(Math.random() * randomNames.length)]}-${Math.floor(Math.random() * 100)}`;
        const pSessionId = randomId();

        location.href = `http://localhost:5173/experiments/ccg-01`
            + `?study_id=ccg-01`
            + `&platform=test-pass`
            + `&pid=${encodeURIComponent(pid)}`
            + `&p_session_id=${encodeURIComponent(pSessionId)}`
            + `&role=participant`;
    })();
};
