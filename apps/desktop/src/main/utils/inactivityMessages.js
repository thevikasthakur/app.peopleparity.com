"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inactivityMessages = void 0;
exports.getRandomInactivityMessage = getRandomInactivityMessage;
/**
 * Messages from a typical Indian manager when user goes inactive
 * Rotates randomly each time
 */
exports.inactivityMessages = [
    {
        title: "☕ Chai Break, Beta?",
        message: "Arrey! Where have you gone? 🤔\n\nTwo screenshots with zero activity - system is showing me everything!\n\nI have paused the tracker only. But kindly remember, we have deliverables pending. Client is asking for updates.\n\nCome back soon and do the needful! 💪"
    },
    {
        title: "📱 WhatsApp Important Hai?",
        message: "Hello ji! 👋\n\nI can see activity has become zero-zero. Hope everything is fine?\n\nTracker has been stopped automatically. But please note, we are having tight deadlines this sprint.\n\nKindly revert back ASAP. Team is waiting for your module! 🏃‍♂️"
    },
    {
        title: "🍛 Lunch Extended Ho Gaya?",
        message: "Good afternoon! 🌞\n\nSystem is showing no activity for 20 minutes. Lunch break extended ho gaya kya?\n\nI've paused the session to maintain your productivity percentage. But remember - 'Early to bed, early to rise' wala concept office mein bhi apply hota hai!\n\nPlease do the needful and resume work. 💼"
    },
    {
        title: "🚽 Bio Break Ya Coffee Break?",
        message: "Hi Dear! 👋\n\nTwo consecutive screenshots with NIL activity detected!\n\nHope you haven't gone for extended bio break. 😅 Tracker stopped to save your utilization metrics.\n\nGentle reminder: Monthly appraisal is coming. Please maintain good productivity!\n\nWaiting for your comeback. 🎯"
    },
    {
        title: "😴 Power Nap in Office Hours?",
        message: "Hello Team Member! 🔔\n\nYour screen is showing zero activity since last 20 minutes!\n\nAre you there? Koi emergency toh nahi?\n\nI've stopped the tracker - don't want HR to see these gaps in your timesheet. But please understand, we need to maintain professional standards.\n\nKindly resume at earliest! 📊"
    },
    {
        title: "🏏 IPL Score Check?",
        message: "Namaste ji! 🙏\n\nActivity dropped to absolute zero! Cricket match chal raha hai kya phone pe? 😏\n\nDon't worry, I've paused your session before management notices.\n\nBut remember - 'Work is Worship!' Company ka kaam bhi important hai.\n\nPlease come back and complete today's tasks! 🎯"
    },
    {
        title: "🚬 Sutta Break?",
        message: "Dear Resource! 🚨\n\nTwo screenshots showing zero productivity!\n\nGone for quick fresh air? Understandable, but frequency should be less.\n\nTracker paused to protect your KPIs. But kindly note, we need to achieve 85% utilization this quarter.\n\nWaiting for your prompt action! ⏰"
    },
    {
        title: "📞 Personal Call Urgent Tha?",
        message: "Hi There! 📱\n\nSystem detected complete inactivity for consecutive screenshots!\n\nPersonal calls happen, I understand. But office hours are for office work only.\n\nI've stopped tracking to save your ratings. Lekin please remember, we are running behind schedule!\n\nKindly prioritize work and come back soon! 💻"
    },
    {
        title: "🍵 Pantry Gossip Session?",
        message: "Hello Hello! 👀\n\nKidhar chale gaye? Activity is showing big ZERO!\n\nPantry politics ya water cooler discussion? 😄\n\nTracker stopped before it affects your performance metrics. But beta, these things should be done in moderation.\n\nPlease resume work - sprint deadline is tomorrow! 🏃‍♂️"
    },
    {
        title: "🎧 Lost in Music?",
        message: "Good Day! 🎵\n\nYour activity has flatlined completely!\n\nMusic is good for concentration, but work bhi karna padega na? 😊\n\nSession paused to maintain your scorecard. Remember, your yearly bonus depends on these metrics!\n\nKindly get back to workstation and show some progress! 📈"
    },
    {
        title: "🏠 WFH Flexibility Misuse?",
        message: "Attention Please! 🏠\n\nTwo screenshots with NIL activity detected!\n\nWork from home doesn't mean Netflix and chill, okay? 😤\n\nI've stopped the tracker - protecting your image only. But remember, with great flexibility comes great responsibility!\n\nPlease maintain discipline and resume immediately! 💪"
    },
    {
        title: "☕ Starbucks Run?",
        message: "Hi Team! ☕\n\nActivity showing absolute zero since 20 minutes!\n\nGone to fancy coffee shop? Office chai not good enough? 😏\n\nTracker paused to save your attendance percentage. But kindly note, too many breaks impact team morale.\n\nCome back with double energy and complete pending items! ⚡"
    },
    {
        title: "📱 Instagram Reels Break?",
        message: "Dear Colleague! 📱\n\nConsecutive screenshots showing no work activity!\n\nReels are addictive, I know. But office laptop is for office work only! 🙈\n\nSession stopped before it reaches senior management dashboard. Please understand, we need to set good example for juniors.\n\nKindly focus and get back to coding! 💻"
    },
    {
        title: "🚗 Parking Issues Again?",
        message: "Hello Ji! 🚗\n\nSystem showing you're completely inactive!\n\nParking problem again? Or gone to move car? 🤔\n\nI've paused tracking to help your utilization numbers. But please, these issues should be sorted before login time.\n\nWaiting for you to come back and deliver! 🎯"
    },
    {
        title: "🍔 Snack Attack Emergency?",
        message: "Greetings! 🍿\n\nTwo screenshots with zero progress detected!\n\nHunger pangs, I understand. But productivity shouldn't suffer! 😅\n\nTracker stopped to maintain your good record. Remember, annual increment discussions are next month.\n\nPlease have quick snack and resume ASAP! 🏃‍♂️"
    },
    {
        title: "💊 Health Break Required?",
        message: "Dear Team Member! 💊\n\nNo activity detected in recent screenshots!\n\nHealth comes first, definitely. If unwell, please apply leave properly. 🏥\n\nI've paused session to protect your metrics. But if you're fine, kindly understand we have commitments to client.\n\nTake care and come back soon! 🙏"
    },
    {
        title: "📞 Manager One-on-One?",
        message: "Hello There! 📞\n\nActivity dropped to zero suddenly!\n\nIn meeting with another manager? Please update calendar next time! 📅\n\nTracker paused to maintain your scorecard. But remember to mark such instances properly in timesheet.\n\nWaiting for you to return and update status! 📊"
    },
    {
        title: "🎮 Quick Gaming Session?",
        message: "Namaste Developer! 🎮\n\nTwo screenshots showing absolutely no productivity!\n\nAlt+Tab to games? Very smart, but system catches everything! 😏\n\nDon't worry, I stopped tracking before HR analytics picks this up. But please, gaming should be after office hours only.\n\nKindly close all unnecessary applications and focus! 🎯"
    },
    {
        title: "🏘️ Neighbor Problem?",
        message: "Hi Dear! 🏘️\n\nComplete inactivity detected in system!\n\nNeighbor calling for some issue? Society problems? 🤷‍♂️\n\nI understand, but office hours should have minimum disturbance. Tracker paused to save your rating.\n\nPlease handle personal matters after 6 PM and come back! ⏰"
    },
    {
        title: "📦 Delivery Collection?",
        message: "Good Day Team! 📦\n\nZero activity for consecutive screenshots!\n\nAmazon delivery arrived? Swiggy order? 📦\n\nSession stopped to protect your utilization percentage. But kindly remember, too many personal activities during work hours is not professional.\n\nPlease prioritize work and return immediately! 💼\n\nWe have standup in 30 minutes! 🏃‍♂️"
    }
];
/**
 * Get a random inactivity message
 */
function getRandomInactivityMessage() {
    const randomIndex = Math.floor(Math.random() * exports.inactivityMessages.length);
    return exports.inactivityMessages[randomIndex];
}
//# sourceMappingURL=inactivityMessages.js.map