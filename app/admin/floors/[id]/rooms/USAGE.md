# Rooms Management - Quick Start Guide

## Accessing the Page

Navigate to: `/admin/floors/[floorId]/rooms`

Or click the "Rooms" button on any floor card in the Floors management page.

## Prerequisites

⚠️ **Important**: The floor must have a blueprint image uploaded before you can manage rooms.

If no blueprint is uploaded, you'll see a message prompting you to upload one first.

## Step-by-Step: Adding Your First Room

### 1. Start Adding a Room
Click the **"Add Room"** button in the top-right corner.

### 2. Fill in Basic Information
- **Room Number**: e.g., "101", "A-12", "Conference-1"
- **Room Name**: e.g., "Office", "Conference Room", "Storage"

### 3. Draw the Room Boundary
- Click **"Draw Polygon on Blueprint"** button
- The modal will close and you'll see the canvas with drawing controls

### 4. Drawing the Polygon
- **Click** on the blueprint to add points
- Each click adds a new corner of your room
- You'll see blue dots at each point and lines connecting them
- The first point will have a green circle around it when you have 3+ points

### 5. Close the Polygon
You have two options:
- **Click near the first point** (within the green circle)
- **Click the "Finish" button** at the bottom of the screen

### 6. Save the Room
- The drawing will close and reopen the modal
- You'll see "✓ Polygon defined (N points)"
- Click **"Create Room"** to save

## Editing an Existing Room

### Method 1: Click on Canvas
Simply click on any colored room polygon on the canvas.

### Method 2: Use Sidebar
Click the edit (pencil) button next to any room in the right sidebar.

### Editing Details
- Modify room number or name as needed
- Click **"Redraw"** to change the polygon boundary
- Click **"Update Room"** to save changes

## Deleting a Room

Click the delete (trash) button next to any room in the sidebar.
You'll be asked to confirm before deletion.

## Canvas Navigation

### Zoom
- **Mouse Wheel**: Scroll up/down to zoom in/out
- **Zoom Buttons**: Use the +/- buttons in top-right corner
- **Mobile**: Pinch to zoom on touchscreens

### Pan
- **Mouse**: Click and drag to move around
- **Mobile**: Touch and drag to move around

### Reset
Click the **"Reset"** button to return to default view (100% zoom, centered).

## Tips & Tricks

### Drawing Accurate Polygons
1. **Zoom in** before drawing for better precision
2. Click corners in a **clockwise or counter-clockwise** order
3. Don't worry about perfection - you can always edit later

### Visual Feedback
- **Hover** over rooms in the sidebar to highlight them on the canvas
- **Different colors** help distinguish between rooms
- **Room numbers** are displayed at the center of each polygon

### Mobile Usage
- Use **two fingers** to zoom (pinch gesture)
- Use **one finger** to pan or draw
- Tap precisely on corners for accurate polygons

### Common Issues

**Problem**: Can't see the canvas or blueprint
- **Solution**: Make sure a blueprint image is uploaded for this floor

**Problem**: Polygon won't close
- **Solution**: Make sure you have at least 3 points, then click near the first point

**Problem**: Canvas is too small/large
- **Solution**: Use the zoom controls or reset view button

**Problem**: Accidentally added wrong point while drawing
- **Solution**: Click "Cancel" and start over, or finish and then edit

## Keyboard Shortcuts

Currently, all interactions are mouse/touch-based. Keyboard shortcuts may be added in future updates.

## Data Storage

Room polygons are stored as normalized coordinates (values between 0 and 1) relative to the blueprint dimensions. This ensures:
- ✅ Accuracy across different screen sizes
- ✅ Consistency when blueprint is viewed at different zoom levels
- ✅ Compatibility with future features

## Example Workflow

```
1. Upload blueprint to floor (from Floors page)
2. Navigate to Rooms page for that floor
3. Click "Add Room"
4. Enter "101" and "Manager Office"
5. Click "Draw Polygon on Blueprint"
6. Zoom in on the blueprint to the room location
7. Click the four corners of the office
8. Click near the first corner to close
9. Click "Create Room"
10. Repeat for other rooms
```

## Next Steps

After defining all your rooms:
- Use them when creating walkdowns
- Associate issues with specific rooms
- Generate room-based reports
- Export floor plans with room data
