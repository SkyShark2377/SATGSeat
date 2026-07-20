export const HelpContent = {
    classrooms: {
        title: "Help: Room Management",
        body: `Think of this screen as your physical blueprint builder. What you build here is permanent. Changes made to desks and furniture in this tab will affect every single class period that meets in this room.\n\n` +
              `• ADDING FURNITURE: Use the menu to drop desk rows, pods, and classroom assets (like a Smartboard or Rug) onto the grid. Drag to position them.\n\n` +
              `• THE COMPASS ROSE: This circular icon defines the "Front" of your room. Drag it to your primary teaching position. The Auto-Assigner uses this point as a magnet, seating students with "Preferred Seating" as close to the compass as possible.\n\n` +
              `• ROOM DESIGN: Double-click any non-student-desk furniture to open its properties. Here you can lock its position and size so you don't accidentally drag it while designing your room.`
    },
    seating: {
        title: "Help: Seating Charts",
        body: `This screen is for day-to-day student placement. Desks moved here are temporary for this specific class period. To permanently move a desk, go to the Rooms tab.\n\n` +
              `• MANUAL SEATING: Drag a student from the sidebar and drop them onto an empty desk.\n\n` +
              `• DESK ACTIONS: Double-click a seated student to Lock them to the desk (prevents Auto-Assign from moving them) or Evict them back to the roster.  You can also lock an empty desk if you want that desk to remain unused.\n\n` +
              `• ANCHORING (Homeroom Only): If this is your Homeroom period, you can "Anchor" a student to a desk. This reserves that physical desk for them across all other periods in this room. You can also bulk-anchor the entire class or remaining unanchored students.\n\n` +
              `• AUTO-ASSIGN: Automatically seats remaining students based on gender-balancing rules, keeping separated students apart, and pulling preferred seating students toward the Compass Rose.\n\n` +
              `• EXPORT PDF: Generates a clean, print-ready seating chart, hiding the background grid and layout icons.  Make use of the POV button at the bottom of the menu to switch to teacher view.  This will rotate the names 180 degrees for use from the front of the room when taking attendance.`
    },
    periods: {
        title: "Help: Period Management",
        body: `Use this screen to build your daily teaching schedule and connect your student rosters to your physical classrooms.\n\n` +
              `• CREATING A PERIOD: Give your class a name (e.g., "1st Period Science") and select which physical Room blueprint it should use.\n\n` +
              `• HOMEROOM: Your designated Homeroom period is special. This is the only period where you can assign permanent "Anchors" to reserve physical desks for specific students.\n\n` +
              `• ASSIGNING ROSTERS: Select students from your Master Roster to add them to a specific class period. Only students assigned to the period here will appear in the Seating tab for placement.  The "Populate Homeroom Roster" button will place all students assigned as homeroom to your homeroom class. `
    },
    students: {
        title: "Help: Master Roster Registry",
        body: `This is your global student database. Students added here can be assigned to any of your class periods.\n\n` +
              `• ADDING STUDENTS: You can add students manually or use the Import tool to upload a standard CSV roster from your school's grading software.\n\n` +
              `• PREFERRED SEATING: Check this box if a student needs to sit near the front. The Auto-Assigner will automatically attempt to seat them closest to the Compass Rose.\n\n` +
			  `• HOMEROOM: Check this box if a student is assigned to your homeroom.  A small house icon will appear wherever their name is used to easily see which students in any given class are from your homeroom. \n\n` +
              `• SEPARATIONS: If two students absolutely cannot sit next to each other, use the restriction feature. The Auto-Assigner will ensure a minimum physical distance between them in all seating charts.`
    }
};