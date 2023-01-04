# MMM-CalendarExt3Timeline
Successor of CX2Timeline, Magicmirror module. A sibling module of MMM-CalendarExt3. This module would show timeline of events.


## Screenshot
![screenshot](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-CalendarExt3Timeline/CX3T.png)



## Concept
This is a sibling module of [`MMM-CalendarExt3`](https://github.com/MMRIZE/MMM-CalendarExt3). This module is made to be an alternative to my previous module MMM-CalendarExtTimeline.




## Features
### What's different with `MMM-CalendarExtTimeline`.
- Only focusing on how it shows; Parsing is delegated to original MagicMirror module `calendar`. (It means the `calendar` module is REQUIRED to use this module.)
- Respect to original MM's hide/show mechanism. Now you can hide/show this module easily with other scheduler or control modules. (By the way, Look at this module also. - [MMM-Scenes](https://github.com/MMRIZE/MMM-Scenes))
- No dependency on the 3rd party modules (e.g. momentJS or Luxon, etc.). This is built with pure JS and CSS only.
- This module is not compatible with `CX` or `CX2`.

### Main Features
- `Timeline` view of events for some sequential hours.
- locale-aware calendar
- customizing events: filtering, transforming
- multi-instances available. You don't need to copy and rename the module. Just add one more configuration in your `config.js`.


## Install
```sh
cd ~/MagicMirror/modules
git clone https://github.com/MMRIZE/MMM-CalendarExt3Timeline
```

## Config
Anyway, even this simplest will work.
```js
{
  module: "MMM-CalendarExt3Timeline",
  position: "bottom_center",
},

```

More conventional;
```js
{
  module: "MMM-CalendarExt3Timeline",
  position: "bottom_center",
  title: "",
  config: {
    locale: 'en-US',
    staticMode: false,
    beginHour: -3,
    hourLength: 24,
    useSymbol: true,
    displayLegend: true,
    calendarSet: ['us_holiday', 'Tottenham'],
  }
},
```

You need setup default `calendar` configuration also.
```js
/* default/calendar module configuration */
{
  module: "calendar",
  position: "top_left",
  config: {
    broadcastPastEvents: true, // <= IMPORTANT to see past events
    calendars: [
      {
        url: "webcal://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics",
        name: "us_holiday", // <= RECOMMENDED to assign name
        color: "red" // <= RECOMMENDED to assign color
      },
      ...

```

### Config details
All the properties are omittable, and if omitted, a default value will be applied.

|**property**|**default**|**description**|
|---|---|---|
|`instanceId` | (auto-generated) | When you want more than 1 instance of this module, each instance would need this value to distinguish each other. If you don't assign this property, the `identifier` of the module instance will be assigned automatically but not recommended to use it. (Hard to guess the auto-assigned value.)|
|`locale` | (`language` of MM config) | `de` or `ko-KR` or `ja-Jpan-JP-u-ca-japanese-hc-h12`. It defines how to handle and display your date-time values by the locale. When omitted, the default `language` config value of MM. |
|`calendarSet` | [] | When you want to display only selected calendars, fulfil this array with the targeted calendar name(of the default `calendar` module). <br>e.g) `calendarSet: ['us_holiday', 'office'],`<br> `[]` or `null` will allow all the calendars. |
|`staticMode` | true | See the `Mode` part. |
|`hourLength` | 24 | Timeline will show this period totally. |
|`beginHour` | 0 | See the `Mode` part. |
|`maxSlots` | 5 | How many events will be stacked in timeline. The overflowed events will be hidden. |
|`hourIndexOptions` | {hour: 'numeric'} | The format of hour index. It varies by the `locale` and this option. <br> `locale:'en-US'`, the default displaying will be `6 PM`.<br> See [options](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#parameters) | 
|`dateIndexOptions`|{dayStyle: 'short'} | The format of date index of timeline. It varies by the `locale` and this option. <br> `locale:'en-US'`, the default displaying will be `12/25/2022`.<br> See [options](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#parameters) |
|`eventFitler`| callback function | See the `Filtering` part.|
|`eventTransformer`| callback function | See the `Transforming` part.|
|`waitFetch`| 5000 | (ms) waiting the fetching of last calendar to prevent flickering view by too frequent fetching. |
|`refreshInterval`| 60000 | (ms) refresh view by force if you need it. |
|`animationSpeed` | 1000 | (ms) Refreshing the view smoothly. |
|`useSymbol` | true | Whether to show font-awesome symbold instead of simple dot icon. |
|`displayLegend` | false | If you set as true, legend will be displayed. (Only the clanear which has name assigned)|
|`preProcessor` | callback function | See the `pre-processing` part |

## Notification
### Incoming Notifications
#### `CALENDAR_EVENTS`
Any module which can emit this notification could become the source of this module. Generally, the default `calendar` module would be.

### Outgoing Notification
Nothing yet.  (Does it need?)

## Styling with CSS
You can handle almost all of the visual things with CSS. See the `module.css` and override your needs into your `custom.css`.
- `CX3T`, `CX3T_{instanceId}`, `bodice` : The root selector. Each instance of this module will have `CX3T_{instanceId}` as another root selector. With this CSS selector, you can assign individual look to each instance.

- `.event` : Every event has this selector. Each event could have these class name together by its condition.
  - `.toFuture`, `.fromPast`
  - `.calendar_{calendarName}` : Orginal `calendar`
  - `.passed`, `.future`, `.current`, 
  - `.multiday`, `.singleday`, `.fullday`

And `event` also has `dataSet` (`data-*`) as its attributes. (e.g. data-title="...", data-start-date="...") You can use these attributes also.

- `.indexContainer .dateIndices` : Area for dateIndex
  - `.dateIndex .index` : Each day index. It has `data-datetime` and `data-length` attributes.
    - `.cellDateIndexParts`: Parts of indicator

- `.indexContainer .hourIndices` : Area for hourIndex
  - `.hourIndex .index` : Each hour index. It has `data-hour` attribute.
    - `.cellHourIndexParts`: Parts of indicator

## Handling Events
Each event object has this structure.
```json
{
  "title": "Leeds United - Chelsea",
  "startDate": 1650193200000,
  "endDate": 1650199500000,
  "fullDayEvent": false,
  "class": "PUBLIC",
  "location": false,
  "geo": false,
  "description": "...",
  "today": false,
  "symbol": ["calendar-alt"],
  "calendarName": "tottenham",
  "color": "gold",
  "calendarSeq": 1, // This would be the order from `calendarSet` of configuration
  "isPassed": true,
  "isCurrent": false,
  "isFuture": false,
  "isFullday": false,
  "isMultiday": false
}
```
You can use these values to handle events.

### Filtering
You can filter each event by its condition.
```js
eventFilter: (ev) => {
  if (ev.isFullday) return false
  return true
}
```
This example shows how you can filter out 'fullday' events.

### Transforming
You can manipulate or change the properties of the event.
```js
eventTransformer: (ev) => {
  if (ev.title.search('John') > -1) ev.color = 'blue'
  return ev
}
```
This example shows how you can transform the color of events when the event title has specific text.


### Preprocessing
```js
preProcessor: (ev) => {
  if (ev.title.includes('test')) return null
  if (ev.calendarName === 'Specific calendar') ev.startDate += 2 * 60 * 60 * 1000
  return ev
}
```
This example shows 1) if the title of event has `test`, drop the event off 2) then add 2 hours to the start time of events on specific calendar.

Unlike `eventTransformer`, the `preProcessor` would be applied to raw data format of events from the default `calendar` module or equivalent. This is the better place to adjust event itself to make it compatible with this module.




## Mode
This module could have one of 2 modes, `staticMode: true` and `staticMode: false`.
### `staticMode: true`
The timeline will start from beginnig of day. Usually it is `00:00`, however when you set `beginHour`, the value would be added. If you want to show overview of the period, this would be better.

```js
staticMode: true,
beginHour: -3,
hourLengh: 12,
```
This configuration will make the timeline will show from `9 PM` of the previousday to `9 AM` of the day. (The reference date would depend on whether your current moment is included in the timeline.) 

### `staticMode: false`
The timeline will start from begining of exact hour of current. If it would be `07:45`, timeline would start from `7 AM`. This mode is convenient when you want to focus the current moment.
```js
staticMode: false,
beginHour: -3,
hourLength: 12,
```
This configuration will make the timeline will show from `3 hours ago` to `9 hours later` of current moment.

## Fun things

### Font Awesome icons with brands
You can set `brands` icons like this; (However, default calendar module cannot accept FA brands icons AFAIK.)
```js
/* In your default calendar config */
symbol: ['fa-brands fa-canadian-maple-leaf'],
/* or */
symbol: ['brands canadian-maple-leaf'],
/* of course below are also allowed */
symbol: 'brands canadian-maple-leaf',
/* But if you want multi-icons, use array */
symbol: ['brands google-drive', 'solid calendar'],
```

### Compatible with `randomBrainstormer/MMM-GoogleCalendar`
```js
preProcessor: (e) => {
  e.startDate = new Date(e.start?.date || e.start?.dateTime).valueOf()
  e.endDate = new Date(e.end?.date || e.end?.dateTime).valueOf()
  e.title = e.summary
  e.fulldayEvent = (e.start?.date) ? true : false
  return e
}
```
>> This tip doesn't consider different timezone. You might need to adjsut `startDate` and `endDate` additionally to convert event into your timezone.


## Not the bug, but...
- The default `calendar` module cannot emit the exact starting time of `multidays-fullday-event which is passing current moment`. Always it starts from today despite of original event starting time. So this module displays these kinds of multidays-fullday-event weirdly.


## History
### 1.1.0 (2023-01-04)
- **ADDED** : `preProcessor` to adjust event data when it arrives as notification. It helps to escape side-effect on `eventFilter`, `eventTransformer` early applying. 
- **FIXED** : Timing of `eventFilter/Transformer` was delayed to draw time to prevent side-effects.
>> These features are importnat so would be applied `CX3` and `CX3A` also, but not yet.
### 1.0.0 (2022-11-11)
- Released.

## Author
- Seongnoh Yi (eouia0819@gmail.com)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y56IFLK)

