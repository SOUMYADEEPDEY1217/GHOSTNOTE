import { StoryEntry, StoryLength, StoryStyle } from '../types/ghostnote';

export interface SeedPrompt {
  id: string;
  label: string;
  style: StoryStyle;
  length: StoryLength;
  note: string;
}

export const SEED_PROMPTS: SeedPrompt[] = [
  {
    id: 'seed-hallway',
    label: 'The Extra Door on the Third Landing',
    style: 'Psychological Horror',
    length: 'Medium',
    note: 'Last Tuesday at 3:14 AM I woke up to the sound of brass keys turning in our apartment hallway. When I looked through the peephole, the wallpaper was green damask instead of painted drywall, and there was a narrow mahogany door between Apt 3B and 3C that has never been there in the six years I have lived here.',
  },
  {
    id: 'seed-terminal',
    label: 'Port 11434 Voicemail Buffer',
    style: 'Haunted Terminal',
    length: 'Medium',
    note: 'Found an old ThinkPad T420 in my late uncle’s storage locker. The battery was completely removed, yet when I opened the lid in the dark, a green cursor was blinking on tty3. It was tailing an audio transcription log dated three days in the future—recording my own breathing in the storage unit.',
  },
  {
    id: 'seed-station',
    label: 'The Last Train Past Alderman Marsh',
    style: 'Urban Legend',
    length: 'Long',
    note: 'Commuters on the 11:55 PM northbound regional line swear that if the train stops between milepost 14 and the flooded cedar marsh, you must never look up at the reflection in the upper luggage rack mirror. The conductor locks himself in the cab until the whistle sounds twice.',
  },
  {
    id: 'seed-greenhouse',
    label: 'Winter Jasmine in the Conservatory',
    style: 'Bittersweet Remembrance',
    length: 'Medium',
    note: 'We sold my grandmother’s house in November after the estate cleared. Before handing over the keys, I walked through the empty glass conservatory one last time. Even though the heat had been shut off for a month and frost covered the panes, the air smelled unmistakably of her warm Earl Grey tea and blooming winter jasmine.',
  },
];

export const STARTER_ARCHIVE_ENTRIES: StoryEntry[] = [
  {
    id: 'archive-starter-1',
    title: 'The Draught Behind the Wainscoting',
    originalNote:
      'Every evening around dusk, the floorboards in the north study creak in a deliberate five-step cadence from the bookshelf to the window, pausing exactly where my father used to stand watching the rain.',
    story: `The house did not settle at random; it rehearsed. By late October, when the light draining from the orchard turned the color of tarnished pewter, the north study began its evening measurement. Five paces from the tall walnut bookcase to the bay window, then a pause long enough to strike a match that never lit.

Clara had tried placing heavy wool rugs over the pine boards, and once, in a fit of clinical irritation, she had marked the joints with carpenter's chalk to see if the humidity from the cellar was warping the tongue-and-groove. Yet the chalk lines remained unshifted. The sound was not the sharp snap of cooling timber, but the slow, distribu­ted compression of weight—heel first, then the slight hesitation of a knee that had ached in damp weather since seventy-eight.

On the fourth night of the November gales, she left his brass barometer on the windowsill where his hand had polished a crescent into the varnish. When the fifth step concluded behind her chair, she did not turn around. She simply watched the glass reflection in the dark pane: the rain slanting across the orchard, the empty leather armchair, and the faint, unmistakable fogging of breath against the lower left sash, blooming to the size of a coin before the cold glass reclaimed it.`,
    style: 'Bittersweet Remembrance',
    length: 'Medium',
    createdAt: '2026-10-24T21:14:00.000Z',
    wordCount: 214,
    providerMode: 'sample',
    providerLabel: 'Sample Story (Curated Archive)',
    isSample: true,
  },
  {
    id: 'archive-starter-2',
    title: 'Core Dump at Sector 0x7F8A',
    originalNote:
      'Decommissioned municipal water telemetry server kept writing 14-kilobyte log files every night at 02:41 AM even after the ethernet cable was severed.',
    story: `[02:41:00.004] KERNEL_NOTICE: Carrier lost on eth0 (1094 days elapsed).
[02:41:02.118] AUDIO_SUBSYSTEM: Loopback gain calibrated to -42.0 dB. Listening on /dev/dsp_null.

When the district consolidated the pumping stations in 2019, nobody bothered to unbolt the rackmount unit in Sub-basement B. Its CMOS battery should have bled dry three winters ago, yet the amber chassis LED continued to flicker in a slow, respirator rhythm against the wet concrete wall.

I connected a serial console only to pull the asset serial number for disposal. Instead of a login prompt, the screen scrolled forty thousand lines of pressure-valve telemetry from a reservoir that had been drained and paved over in 1998. Beneath the hexadecimal register dumps, someone—or something—had been using the parity bits to spell out short, phonetic strings in ASCII:

0x7F8A_01: "THE WATER IS STILL RISING BEHIND THE BULKHEAD."
0x7F8A_02: "DO NOT UNPLUG THE PUMP. WE ARE BREATHING THE AIR POCKET."
0x7F8A_03: "WHY DID YOU SEAL THE MANHOLE FROM THE OUTSIDE?"

When I typed "halt -p" to spin down the drives, the cooling fans rose to a deafening shriek, and water—freezing, silt-black, and smelling of deep limestone—began to drip steadily from the serial port's nine-pin housing onto my wrists.`,
    style: 'Haunted Terminal',
    length: 'Medium',
    createdAt: '2026-10-25T03:08:00.000Z',
    wordCount: 212,
    providerMode: 'sample',
    providerLabel: 'Sample Story (Curated Archive)',
    isSample: true,
  },
  {
    id: 'archive-starter-3',
    title: 'The Wallpaper Geometry of Room 409',
    originalNote:
      'Stayed at a quiet railway hotel in the hills. The floral pattern on the wallpaper seemed to rearrange itself whenever I looked at it through the dressing-table mirror.',
    story: `At first glance, the paper in Room 409 was merely an indistinct Victorian botanical—ivies and belladonna vines printed in oxidized sage against a ground of damp parchment. It was the sort of pattern chosen by hoteliers specifically because the eye slides off it without lodging a memory.

Yet while unbuttoning my collar before the triptych mirror on the dressing table, I noticed that the reflection behind my left shoulder contained a symmetry the wall itself lacked. Direct inspection showed trellis loops spaced eleven inches apart. In the silvered glass, however, the vines converged toward the ceiling corner above the wardrobe, braiding themselves into the unmistakable anatomy of a narrow stairwell descending into the plaster.

I tilted the left wing of the mirror half an inch. The reflected stairwell shifted perspective, revealing three stone steps and the hem of a dark worsted coat standing motionless on the landing. When I whipped around to face the corner of the room, there was only flat sage paper and a hairline crack in the cornice. When I looked back into the glass, the figure had descended two steps closer, and the candle sconce beside my bed was reflected as extinguished—though its flame still burned warm against my knuckles.`,
    style: 'Psychological Horror',
    length: 'Medium',
    createdAt: '2026-10-26T00:42:00.000Z',
    wordCount: 205,
    providerMode: 'sample',
    providerLabel: 'Sample Story (Curated Archive)',
    isSample: true,
  },
  {
    id: 'archive-starter-4',
    title: 'The Tollbooth on County Route 19',
    originalNote:
      'Local drivers say there is an unmanned concrete toll plaza that only appears in heavy river fog along the old two-lane bypass, and you have to pay with a coin minted before you were born.',
    story: `County Route 19 has never been a turnpike. You can verify this in the county surveyor's ledger at the courthouse: forty-two miles of two-lane blacktop laid over an 1890s logging grade following the Blackwater River. Yet every autumn, when the thermal inversion traps river fog between the hemlock ridges, the night-shift timber haulers carry a pouch of pre-1970 silver quarters in their glove compartments.

You know you have entered the approach when your radio loses FM stereo pilot tone and drops into a low, rhythmic clicking, like a mechanical odometer turning over in an empty room. Two hundred yards past the rusted truss bridge, sodium-vapor lamps the color of pickled sulfur bloom through the mist, illuminating four narrow concrete islands and a fiberglass booth coated in river moss.

The figure inside wears the braided wool cap of the defunct State Bridge Authority, though the visor is pulled low enough that only a grey chin and a gloved palm extending from the slot are visible. The rule passed down at every diner along the river is absolute: drop a coin minted before your birth year into the basket without touching the wool glove, and never ask for a receipt. The one surveyor from the state capital who handed over a modern quarter in 2014 had his pickup discovered the next morning idling neatly on the shoulder—its odometer rolled backward by thirty-eight thousand miles, and the driver's seat soaked in forty-year-old river silt.`,
    style: 'Urban Legend',
    length: 'Medium',
    createdAt: '2026-10-26T19:30:00.000Z',
    wordCount: 242,
    providerMode: 'sample',
    providerLabel: 'Sample Story (Curated Archive)',
    isSample: true,
  },
];

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * Generates an atmospheric, style-and-length-specific Sample Story offline
 * when no local Ollama instance or cloud provider is selected/available.
 * Honestly marked as Sample Story (Offline Demo).
 */
export function synthesizeSampleStory(
  rawNote: string,
  style: StoryStyle,
  length: StoryLength,
  variant = 0
): { title: string; story: string } {
  const cleanedNote = rawNote.trim();
  const snippet =
    cleanedNote.length > 180 ? `${cleanedNote.slice(0, 177).trim()}...` : cleanedNote;

  // Extract a couple of evocative words from the user's note for title crafting
  const stopWords = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'when', 'there',
    'what', 'about', 'Into', 'into', 'after', 'before', 'while', 'where', 'Every',
    'every', 'last', 'night', 'found', 'heard', 'looked', 'Through', 'through',
  ]);
  const words = cleanedNote
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  const keyNoun = words[variant % Math.max(1, words.length)] || 'Threshold';
  const capitalizedKey = keyNoun.charAt(0).toUpperCase() + keyNoun.slice(1).toLowerCase();

  const titlesByStyle: Record<StoryStyle, string[]> = {
    'Psychological Horror': [
      `The Architecture of ${capitalizedKey}`,
      `What Remained Behind the ${capitalizedKey}`,
      `Notes on the Second ${capitalizedKey}`,
    ],
    'Haunted Terminal': [
      `SESSION_LOG // ${capitalizedKey.toUpperCase()}_BUFFER`,
      `Recovered Sector: ${capitalizedKey} Anomaly`,
      `Daemon Trace on ${capitalizedKey}`,
    ],
    'Urban Legend': [
      `The ${capitalizedKey} Protocol After Midnight`,
      `Why Locals Avoid the ${capitalizedKey}`,
      `The Third Rule of ${capitalizedKey}`,
    ],
    'Bittersweet Remembrance': [
      `Where the ${capitalizedKey} Still Lingers`,
      `Afterlight of the ${capitalizedKey}`,
      `Elegy for a Quiet ${capitalizedKey}`,
    ],
  };

  const styleTitles = titlesByStyle[style];
  const title = styleTitles[variant % styleTitles.length];

  const paragraphsByStyle: Record<StoryStyle, string[]> = {
    'Psychological Horror': [
      `It began with the fragment I wrote down before my hand could steady itself: "${snippet}" At the time, I convinced myself that exhaustion had simply braided two unrelated impressions together—the way a tired eye invents movement in the peripheral grain of an unlit corridor.`,
      `Yet over the following evenings, the geometry of the room refused to return to its former proportions. Small domestic certainties—the distance between the doorframe and the wainscot, the pitch of the silence when the furnace cycles off at three in the morning—acquired a deliberate, watchful asymmetry. Something had learned the cadence of my habits by observing them from the wrong side of the plaster.`,
      `Whenever I stood still long enough to listen, I could hear the faint, dry rustle of an occupancy that predated my lease. Not an intruder forcing a lock, but an older arrangement of the house reasserting its claim over the furniture, patient as damp rising through stone.`,
      `By the seventh night, I realized the note in my pocket was no longer a record of what I had witnessed. The handwriting along the bottom margin had continued for two additional lines in my own ink, describing the exact posture in which I was standing as I read it under the hall lamp.`,
      `Now, when the floorboards settle after midnight, I do not check the locks. Locking a door only confirms which side of the threshold you believe yourself to be on, and the draft beneath the jamb is blowing inward from a room that does not appear on the floorplan.`,
    ],
    'Haunted Terminal': [
      `[ARCHIVE_INGEST // 03:17:44 UTC] Source fragment recovered from non-volatile buffer: "${snippet}" Checksum mismatch detected at block 0x004F; file modification timestamp postdates system clock by 72 hours.`,
      `When the diagnostic routine mounted the volume in read-only mode, the cooling fans dropped to an irregular, respiratory cadence. Standard process monitors reported zero active user sessions, yet tty4 continued to stream low-bitrate acoustic telemetry captured from an unindexed microphone channel.`,
      `[03:18:09] SPECTRAL_DECODE: Background noise floor contains structured harmonic intervals at 19 Hz. Transcription engine confidence: 94.2%. Extracted string: "WE NEVER CLOSED THE DESCRIPTOR. WE ARE STILL ALLOCATED IN THE HEAP."`,
      `Attempts to flush the memory pages resulted in recursive page faults. Every deleted sector re-materialized inside the swap partition with additional annotations—fragments of conversations that took place in this room weeks before the hardware was even unboxed.`,
      `[03:19:59] SYSTEM_HALT_ABORTED: Power switch state overridden by ring-0 interrupt. The cursor on the primary display is no longer waiting for keyboard input; it is pacing back and forth across the eighty-column line like something testing the bars of a cage.`,
    ],
    'Urban Legend': [
      `Every town with an old municipal archive has a story that only surfaces when someone leaves a note like this behind: "${snippet}" Longtime residents never repeat it after sundown, and the county historical society keeps the clipping file in an unnumbered drawer behind the circulation desk.`,
      `According to the night watchmen who worked the shift back in the late nineties, the phenomenon follows a strict, almost bureaucratic etiquette. It never announces itself with thunder or spectacle; instead, it relies on ordinary routines—a late commuter taking a shortcut, an unlocked service stairwell, or a streetlamp flickering out as you pass beneath it.`,
      `Those who have encountered it and walked away intact insist on three precautions: never acknowledge the discrepancy out loud while you are still within sight of the glass, never turn back to check if your footsteps are being matched, and never bring any object you found there across your own threshold.`,
      `In 2018, a graduate researcher tried to document the site with a pair of calibrated field recorders and a time-stamped camera rig. The equipment was recovered intact at dawn, lens caps neatly replaced from the inside, and the SD card contained only a single six-minute audio track of someone politely thanking the researcher by name in an empty room.`,
      `If you ever notice the air growing suddenly still and metallic along that stretch of road, keep your eyes fixed on the white fog line until the pavement levels out. Some places do not want to be mapped; they only want to be remembered.`,
    ],
    'Bittersweet Remembrance': [
      `I kept the note folded inside the front cover of the ledger so I would not forget the exact texture of the moment: "${snippet}" Grief has a way of smoothing away the sharp, ordinary edges of a person's presence until only a formal portrait remains, and I was terrified of losing the small details.`,
      `In the quiet hours before dawn, when the frost settles along the windowpanes in fern-like feathers, the house seems to hold its breath in sympathy. A teacup left on the sideboard retains the faint, resinous warmth of bergamot; the wool coat on the hall peg hangs with the familiar tilt of a shoulder that carried decades of quiet kindness.`,
      `We are taught to think of hauntings as verdicts or warnings, yet the presence that lingers in these rooms asks nothing more than to share the stillness. It is the gentle refusal of love to evacuate a space simply because the calendar has turned a page.`,
      `Sometimes, pausing on the stair landing while the radiator ticks in the dark, I feel the unmistakable steadying pressure of a hand near my elbow—just as it used to rest when the steps were steep and the winter evenings came on too early.`,
      `I no longer try to air out the conservatory or pack away the remaining books. Let the dust settle where it will; some ghosts are only memories that have learned how to keep us company until morning.`,
    ],
  };

  const baseParagraphs = paragraphsByStyle[style];
  let selectedParagraphs: string[];

  if (length === 'Short') {
    selectedParagraphs = baseParagraphs.slice(0, 2);
  } else if (length === 'Medium') {
    selectedParagraphs = baseParagraphs.slice(0, 3);
  } else {
    selectedParagraphs = baseParagraphs.slice(0, 5);
  }

  return {
    title,
    story: selectedParagraphs.join('\n\n'),
  };
}
