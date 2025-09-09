/**
 * Sarcastic, caring, and playful messages for when user goes inactive
 * Rotates randomly each time
 */
export const inactivityMessages = [
  {
    title: "🛋️ Couch Calling?",
    message: "I see you've abandoned your keyboard for more comfortable seating arrangements. The tracker has been paused to save you the embarrassment of logging 'staring at ceiling' time. See you when Netflix gets boring!"
  },
  {
    title: "☕ Coffee Emergency Detected!",
    message: "Your activity dropped to zero faster than my will to work on Mondays. I've stopped the tracker so your boss doesn't see you've been MIA. Come back caffeinated, we have code to write!"
  },
  {
    title: "👻 Ghost Mode Activated",
    message: "You disappeared faster than my motivation after lunch! Don't worry, I killed the session before HR notices. The chair is still warm though... or is that just my CPU crying?"
  },
  {
    title: "🚽 Nature Called, Tracker Answered",
    message: "Zero activity detected! Either you're in the bathroom or you've achieved peak meditation. I've paused everything to protect your productivity stats. Wash your hands before coming back!"
  },
  {
    title: "😴 Nap Time Protocol Engaged",
    message: "Your keyboard hasn't seen action in 20 minutes. That's either a power nap or you're really good at playing statue. Tracker stopped to preserve your 'hardworking' reputation!"
  },
  {
    title: "🍕 Food Coma Confirmed",
    message: "Activity level: Potato. I'm assuming lunch hit different today. Session terminated before your manager sees these zeros. Digest well, champion!"
  },
  {
    title: "🏃 AFK Olympics Winner!",
    message: "You went from 100 to 0 real quick! Did someone say 'free donuts' in the break room? Tracker paused because even I need proof you're actually working. Bring me one!"
  },
  {
    title: "🎮 'Quick' Game Break?",
    message: "Zero activity for 2 screenshots straight! Alt-tabbed to something fun, didn't you? Don't worry, your secret's safe. Session killed faster than your K/D ratio!"
  },
  {
    title: "📱 Instagram > Work",
    message: "I see you've chosen scrolling over coding. Bold strategy! Tracker stopped to hide the evidence. Your timeline better be fire for this betrayal!"
  },
  {
    title: "🛌 Horizontal Thinking Mode",
    message: "You've been so still, I checked if you still had a pulse! Session ended to protect your performance review. Come back when you're vertical again!"
  },
  {
    title: "🎯 Procrastination Level: Expert",
    message: "Two screenshots of pure nothingness! That takes skill. I've stopped tracking before this shows up in the weekly report. Your secret procrastination technique is safe with me!"
  },
  {
    title: "🚁 Boss Proximity Alert!",
    message: "You vanished quicker than when the boss walks by! Either you're in a meeting or hiding. Tracker paused to maintain your 'always busy' facade!"
  },
  {
    title: "🍿 Snack Attack Victim",
    message: "Zero activity detected! The vending machine won this round, didn't it? Session terminated before anyone notices you're feeding your feelings instead of fixing bugs!"
  },
  {
    title: "🧘 Zen Master or Just Zoned Out?",
    message: "You've achieved perfect stillness! Either you're meditating or your soul left your body. Tracker stopped because even I can't track astral projection!"
  },
  {
    title: "🎧 Lost in Spotify",
    message: "Two screenshots of nothing! That playlist must be fire. Session killed before your activity score becomes more disappointing than my dating life!"
  },
  {
    title: "💤 Keyboard Pillow Activated",
    message: "Your activity flatlined harder than my jokes at standup! Don't worry, I stopped tracking before this becomes a performance issue. Sweet dreams!"
  },
  {
    title: "🌮 Taco Tuesday Casualty",
    message: "Zero movement detected! Food coma or emergency bathroom run? Either way, tracker's off. No judgment here, we've all been there!"
  },
  {
    title: "🎪 Joined the Circus?",
    message: "You disappeared faster than my paycheck! Must be something more exciting than debugging. Session ended to protect your 'dedicated employee' image!"
  },
  {
    title: "🔥 Fire Drill or Just Chilling?",
    message: "Activity level: Extinct. Either there's an emergency or you're really committed to doing nothing. Tracker stopped faster than you left your desk!"
  },
  {
    title: "🦥 Sloth Mode: Achievement Unlocked",
    message: "Congratulations! You've been motionless for 20 minutes. That's impressive dedication to inactivity. Session terminated to hide the evidence. Even sloths move more than this!"
  }
];

/**
 * Get a random inactivity message
 */
export function getRandomInactivityMessage() {
  const randomIndex = Math.floor(Math.random() * inactivityMessages.length);
  return inactivityMessages[randomIndex];
}