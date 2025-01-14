# The Public Pixel

[My Notes](notes.md)

The public pixel is a community made pixel art engeine. Inspired by r/place, this will be a home for strangers to colaborate on pixle art.

Every five minutes a user may color a pixle. Between these moments, a user can 'plan' for a pixle, denoting that they plan for it to match a certain color in the future. When placing a pixle, users will be informed of any plans for that pixle and will have the opporutnity to accept or reject the plan.

Users get a log of users who accept their plan or override a pixle they built.

## 🚀 Specification Deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [x] Proper use of Markdown
- [x] A concise and compelling elevator pitch
- [x] Description of key features
- [x] Description of how you will use each technology
- [x] One or more rough sketches of your application. Images must be embedded in this file using Markdown image references.

### Elevator pitch

Have you ever wanted to make fun pixel art, but don't know where to start? don't worry! The public Pixel is where you can have fun making pixel art with the public, while engaging in a gamified turf war. Color pixles with the colors of the day, provided by a third party, and plan for future works to seek the colaboration of the internet.

### Design
[view the ninjamock](https://ninjamock.com/s/TDX91Lx)
![image](ThePublicPixel.png)

### Key features

- Users can color pixles with the color of the day every 5 minutes.
- Users can plan for a pixle so other users can see that plan - When a user clicks on a pixle, a simple menu of users will be provided who currently have a plan for that pixle. Hovering over those user names will render their full plan on the screen. You can choose to follow a plan, or ignore them all.
- Users can have a log of relivent changes.

### Technologies

I am going to use the required technologies in the following ways.

- **HTML** - Text boxes for timer, and UI, and placeholder squares.
- **CSS** - Format timer, keep UI clean.
- **React** - Encode, decode pixle array, and plans array. Allow the user to select a color from the pallet, and mark a pixel with that color. Also allow the user to plan for up to 40ish pixels, and notify a user if they ever select a pixle that has a plan so they can preview the plan, and decide to follow it or not. A super simple overlay grapfic will show the user the planned pixles from the other user. 
- **Service** - Send/receive chaning pixles, and plans, and notifications. Keep a record of timestamps when the user submit the last pixle so you can authenticate if they are allowed to submit another.
- **DB/Login** - need an account to know when you can make a change to the public pixel art. Store the array of public pixels, as well as an array of user data that contains planned pixels, and a log of the last few relivent changes.
- **WebSocket** - The colors of the day will be dependet on [zoodinkers color of the day](https://colors.zoodinkers.com/) I will also add a script that generates a few more hex codes by offseting that zoodinkers one, so the user has about 5 colors every day to choose from.

## 🚀 AWS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Server deployed and accessible with custom domain name** - [My server link](https://yourdomainnamehere.click).

## 🚀 HTML deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **HTML pages** - I did not complete this part of the deliverable.
- [ ] **Proper HTML element usage** - I did not complete this part of the deliverable.
- [ ] **Links** - I did not complete this part of the deliverable.
- [ ] **Text** - I did not complete this part of the deliverable.
- [ ] **3rd party API placeholder** - I did not complete this part of the deliverable.
- [ ] **Images** - I did not complete this part of the deliverable.
- [ ] **Login placeholder** - I did not complete this part of the deliverable.
- [ ] **DB data placeholder** - I did not complete this part of the deliverable.
- [ ] **WebSocket placeholder** - I did not complete this part of the deliverable.

## 🚀 CSS deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Header, footer, and main content body** - I did not complete this part of the deliverable.
- [ ] **Navigation elements** - I did not complete this part of the deliverable.
- [ ] **Responsive to window resizing** - I did not complete this part of the deliverable.
- [ ] **Application elements** - I did not complete this part of the deliverable.
- [ ] **Application text content** - I did not complete this part of the deliverable.
- [ ] **Application images** - I did not complete this part of the deliverable.

## 🚀 React part 1: Routing deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Bundled using Vite** - I did not complete this part of the deliverable.
- [ ] **Components** - I did not complete this part of the deliverable.
- [ ] **Router** - Routing between login and voting components.

## 🚀 React part 2: Reactivity

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **All functionality implemented or mocked out** - I did not complete this part of the deliverable.
- [ ] **Hooks** - I did not complete this part of the deliverable.

## 🚀 Service deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Node.js/Express HTTP service** - I did not complete this part of the deliverable.
- [ ] **Static middleware for frontend** - I did not complete this part of the deliverable.
- [ ] **Calls to third party endpoints** - I did not complete this part of the deliverable.
- [ ] **Backend service endpoints** - I did not complete this part of the deliverable.
- [ ] **Frontend calls service endpoints** - I did not complete this part of the deliverable.

## 🚀 DB/Login deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **User registration** - I did not complete this part of the deliverable.
- [ ] **User login and logout** - I did not complete this part of the deliverable.
- [ ] **Stores data in MongoDB** - I did not complete this part of the deliverable.
- [ ] **Stores credentials in MongoDB** - I did not complete this part of the deliverable.
- [ ] **Restricts functionality based on authentication** - I did not complete this part of the deliverable.

## 🚀 WebSocket deliverable

For this deliverable I did the following. I checked the box `[x]` and added a description for things I completed.

- [ ] **Backend listens for WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Frontend makes WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **Data sent over WebSocket connection** - I did not complete this part of the deliverable.
- [ ] **WebSocket data displayed** - I did not complete this part of the deliverable.
- [ ] **Application is fully functional** - I did not complete this part of the deliverable.
