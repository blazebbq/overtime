# Rooms Management Page

## Overview
Interactive room management interface for defining and editing room boundaries on floor blueprints using polygon drawing tools.

## Features

### 1. Interactive Canvas
- **Blueprint Display**: Shows the floor blueprint image with zoom and pan controls
- **Polygon Drawing**: Click to add points and define room boundaries
- **Live Preview**: See polygons as they're being drawn with visual feedback
- **Normalized Coordinates**: Stores polygon points as 0..1 normalized values relative to blueprint dimensions

### 2. Zoom & Pan Controls
- **Mouse Wheel**: Scroll to zoom in/out
- **Drag**: Click and drag to pan around the blueprint
- **Zoom Buttons**: UI buttons for precise zoom control
- **Reset View**: One-click return to original view
- **Mobile Support**: Pinch-to-zoom and drag support on touchscreens

### 3. Room Management
- **Add Room**: Create new rooms with room number, name, and polygon boundary
- **Edit Room**: Modify existing room details and boundaries
- **Delete Room**: Remove rooms with confirmation
- **Visual Selection**: Click on room polygons to select and edit
- **Color Coding**: Each room has a unique color for easy identification

### 4. Drawing Workflow
1. Click "Add Room" button
2. Fill in room number and name
3. Click "Draw Polygon on Blueprint"
4. Click on blueprint to add polygon points
5. Click near the first point or press "Finish" to close the polygon
6. Save the room

### 5. Editing Workflow
1. Click on a room polygon on the canvas, or
2. Click edit button in the rooms list sidebar
3. Modify room details as needed
4. Click "Redraw" to change the polygon boundary
5. Save changes

## Technical Details

### Coordinate Normalization
Room polygon coordinates are stored as normalized values (0..1) to maintain accuracy across different viewport sizes:

```typescript
normalizedX = clickX / blueprintWidth
normalizedY = clickY / blueprintHeight
```

When rendering, coordinates are converted back:
```typescript
canvasX = normalizedX * blueprintWidth
canvasY = normalizedY * blueprintHeight
```

### Data Structure
```typescript
type Point = {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
};

type Room = {
  id: string;
  name: string;
  roomNumber: string;
  floorId: string;
  polygonJson: string; // JSON.stringify(Point[])
};
```

### Canvas Rendering
- Uses HTML5 Canvas for high-performance rendering
- Implements transformation matrix for zoom/pan
- Renders blueprint image as base layer
- Overlays room polygons with transparency
- Highlights hovered and selected rooms

### Mobile Optimizations
- Touch event handlers for pinch-zoom
- Responsive layout with collapsible sidebar
- Touch-friendly controls and hit targets
- Prevents default touch behaviors to avoid conflicts

## API Endpoints Used

### GET `/api/floors/:id`
Fetches floor details including blueprint URL and dimensions

### GET `/api/rooms?floorId={id}`
Fetches all rooms for the specified floor

### POST `/api/rooms`
Creates a new room with polygon data

### PATCH `/api/rooms/:id`
Updates room details and polygon

### DELETE `/api/rooms/:id`
Deletes a room

## User Interface Components

### Header
- Back button to floors list
- Floor and building name display
- Add Room button

### Canvas Area
- Full-size blueprint canvas
- Zoom controls overlay (top-right)
- Drawing controls (bottom-center, when active)
- Zoom level indicator (bottom-right)

### Rooms Sidebar
- Scrollable list of all rooms
- Color-coded room indicators
- Room number and name display
- Edit and delete buttons per room
- Hover highlights corresponding canvas polygon

### Modal Dialog
- Room number input (required)
- Room name input (required)
- Polygon status indicator
- Draw/Redraw polygon button
- Save and Cancel buttons

## Keyboard & Mouse Interactions

### Mouse
- **Click**: Add polygon point (when drawing) / Select room (normal mode)
- **Drag**: Pan canvas (normal mode)
- **Wheel**: Zoom in/out
- **Hover**: Highlight room polygon

### Touch (Mobile)
- **Tap**: Add polygon point (when drawing) / Select room (normal mode)
- **Drag**: Pan canvas (normal mode)
- **Pinch**: Zoom in/out

## State Management

### Canvas State
```typescript
{
  scale: number;              // Zoom level (1 = 100%)
  offsetX: number;            // Pan offset X
  offsetY: number;            // Pan offset Y
  isDragging: boolean;        // Pan drag active
  lastMouseX: number;         // Last mouse X position
  lastMouseY: number;         // Last mouse Y position
  initialPinchDistance: null | number;  // For pinch-zoom
  initialPinchScale: number;  // Original scale before pinch
}
```

### Drawing State
- `isDrawing`: Boolean indicating if polygon drawing is active
- `currentPolygon`: Array of points being drawn
- `hoveredRoomId`: ID of currently hovered room
- `editingRoomId`: ID of room being edited

## Error Handling

- **No Blueprint**: Shows message prompting user to upload blueprint first
- **Invalid Floor**: Displays "Floor not found" message
- **API Errors**: Toast notifications for failed operations
- **Invalid Polygons**: Gracefully ignores malformed polygon data
- **Minimum Points**: Requires at least 3 points to close a polygon

## Validation Rules

1. **Room Number**: Required, string
2. **Room Name**: Required, string
3. **Polygon**: Required, minimum 3 points
4. **Coordinates**: Must be within 0..1 range

## Performance Considerations

- Canvas redraws are optimized using `useCallback`
- Image loaded once and cached in ref
- Efficient point-in-polygon algorithm
- Debounced hover detection
- Minimal re-renders through proper state management

## Browser Compatibility

- Modern browsers with Canvas API support
- Touch events for mobile devices
- Mouse wheel events for zoom
- Responsive CSS for various screen sizes

## Future Enhancements

Potential improvements:
- Undo/redo for polygon editing
- Snap to grid for precise alignment
- Copy/paste room boundaries
- Bulk room import/export
- Room templates
- Measurement tools (area, perimeter)
- Room labels on canvas
