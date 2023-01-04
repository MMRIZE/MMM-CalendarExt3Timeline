// This file is reserved to refactor all CX3* modules, so atm it is doing nothing but needed. Don't touch this.
const MAGIC_IDENTIFIER = 'CX3_MAGIC'

const loaded = true
const uid = Date.now()

const magicPool = new Map()

const getL = (rgba) => {
  let [r, g, b, a] = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/).slice(1)
  r /= 255
  g /= 255
  b /= 255
  const l = Math.max(r, g, b)
  const s = l - Math.min(r, g, b)
  const h = s ? l === r ? (g - b) / s : l === g ? 2 + (b - r) / s : 4 + (r - g) / s : 0
  // let rh = 60 * h < 0 ? 60 * h + 360 : 60 * h
  // let rs = 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)
  let rl = (100 * (2 * l - s)) / 2
  return rl
}

const regularizeEvents = ({storedEvents, eventPool, sender, payload, config}) => {
  eventPool.set(sender.identifier, JSON.parse(JSON.stringify(payload)))
  let calendarSet = (Array.isArray(config.calendarSet)) ? [...config.calendarSet] : []
  if (calendarSet.length > 0) {
    eventPool.set(sender.identifier, eventPool.get(sender.identifier).filter((ev) => {
      return (calendarSet.includes(ev.calendarName))
    }).map((ev) => {
      let i = calendarSet.findIndex((name) => {
        return name === ev.calendarName
      }) + 1
      ev.calendarSeq = i
      return ev
    }))
  }
  storedEvents = [...eventPool.values()].reduce((result, cur) => {
    return [...result, ...cur]
  }, [])

  if (typeof config.preProcessor === 'function') {
    storedEvents = storedEvents.map(config.preProcessor)
  }

  return storedEvents
}

const scheduledRefresh = ({refreshTimer, refreshInterval, job}) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  refreshTimer = setTimeout(() => {
    clearTimeout(refreshTimer)
    refreshTimer = null
    job()
  }, refreshInterval)
}

const renderEvent = (event, {
  useSymbol
}) => {
  let e = document.createElement('div')
  e.classList.add('event')
  event.calendarName ? e.classList.add('calendar_' + encodeURI(event.calendarName)) : null
  if (event?.class) e.classList.add(event.class)
  if (event.fullDayEvent) e.classList.add('fullday')
  if (event.isPassed) e.classList.add('passed')
  if (event.isCurrent) e.classList.add('current')
  if (event.isFuture) e.classList.add('future')
  if (event.isMultiday) e.classList.add('multiday')
  if (!(event.isMultiday || event.fullDayEvent)) e.classList.add('singleday')    
  e.dataset.calendarSeq = event?.calendarSeq ?? 0
  event.calendarName ? (e.dataset.calendarName = event.calendarName) : null 
  e.dataset.color = event.color
  e.dataset.description = event.description || ''
  e.dataset.title = event.title
  e.dataset.fullDayEvent = event.fullDayEvent
  e.dataset.geo = event.geo
  e.dataset.location = event.location || ''
  e.dataset.startDate = event.startDate
  e.dataset.endDate = event.endDate
  e.dataset.symbol = event.symbol.join(' ')

  e.style.setProperty('--calendarColor', event.color)

  //console.log('>', this.instanceId) // TODO : Make sharable.
  oppositeMagic(e, event)

  if (useSymbol && Array.isArray(event.symbol) && event.symbol.length > 0) {
    event.symbol.forEach((symbol) => {
      let exDom = document.createElement('span')
      exDom.classList.add('symbol')
      if (symbol) {
        exDom.classList.add('fa', ...(symbol.split(' ').map((s) => {
          return 'fa-' + (s.replace(/^fa\-/i, ''))
        })))
      } else {
        exDom.classList.add('noSymbol')
      }
      e.appendChild(exDom)
    })
  } else {
    let exDom = document.createElement('span')
    exDom.classList.add('noSymbol', 'symbol')
    e.appendChild(exDom)
  }

  let t = document.createElement('span') 
  t.classList.add('eventTitle')
  t.innerHTML = event.title
  e.appendChild(t)
  return e
}

const oppositeMagic = (e, original) => {
  if (magicPool.has(original.color)) {
    original.oppositeColor = magicPool.get(original.color)
  } else {
    let magic = prepareMagic()
    magic.style.color = original.color
    let l = getL(window.getComputedStyle(magic).getPropertyValue('color'))
    original.oppositeColor = (l > 50) ? 'black' : 'white'
  }
  e.style.setProperty('--oppositeColor', original.oppositeColor)
}

const prepareEvents = ({storedEvents, range, config}) => {
  const thisMoment = new Date()
  const isCurrent = (ev) => {
    let tm = Date.now()
    return (ev.endDate >= tm && ev.startDate <= tm)
  }
  const isPassed = (ev) => {
    return (ev.endDate < thisMoment.valueOf())
  }
  const isFuture = (ev) => {
    return (ev.startDate > thisMoment.valueOf())
  }
  const isMultiday = (ev) => {
    let s = new Date(ev.startDate)
    let e = new Date(ev.endDate)
    return ((s.getDate() !== e.getDate())
      || (s.getMonth() !== e.getMonth())
      || (s.getFullYear() !== e.getFullYear()))
  }

  let events = storedEvents.filter((evs) => {
    return !(evs.endDate <= range[0] || evs.startDate >= range[1])
  }).sort((a, b) => {
    return (a.startDate === b.startDate) ? a.endDate - b.endDate : a.startDate - b.startDate
  }).map((ev) => {
    ev.startDate = +ev.startDate
    ev.endDate = +ev.endDate
    let et = new Date(+ev.endDate)
    if (et.getHours() === 0 && et.getMinutes() === 0 && et.getSeconds() === 0 && et.getMilliseconds() === 0) ev.endDate = ev.endDate - 1
    ev.isPassed = isPassed(ev)
    ev.isCurrent = isCurrent(ev)
    ev.isFuture = isFuture(ev)
    ev.isFullday = ev.fullDayEvent
    ev.isMultiday = isMultiday(ev)
    return ev
  })

  if (typeof config.eventFilter === 'function') {
    events = events.filter(config.eventFilter)
  }

  if (typeof config.eventTransformer === 'function') {
    events = events.map(config.eventTransformer)
  }

  if (typeof config.eventSorter === 'function') {
    events = events.sort(config.eventSorter)
  }

  return events
}

const prepareMagic = () => {
  let magic = document.getElementById(MAGIC_IDENTIFIER)
  if (!magic) {
    magic = document.createElement('div')
    magic.id = MAGIC_IDENTIFIER
    magic.style.display = 'none'
    document.body.appendChild(magic)
  }
  return magic
}

const initModule = (m, language) => {
  m.storedEvents = []
  m.locale = Intl.getCanonicalLocales(m.config.locale ?? language )?.[0] ?? ''
  m.refreshTimer = null
  m.eventPool = new Map()
}

const displayLegend = (dom, events, options = {}) => {
  let lDom = document.createElement('div')
  lDom.classList.add('legends')
  let legendData = new Map()
  for (let ev of events) {
    if (!legendData.has(ev.calendarName)) legendData.set(ev.calendarName, {
      name: ev.calendarName,
      color: ev.color ?? null,
      oppositeColor: ev.oppositeColor,
      symbol: ev.symbol ?? []
    })
  }
  for (let l of legendData.values()) {
    let ld = document.createElement('div')
    ld.classList.add('legend')
    if (options?.useSymbol) {
      ld.classList.add('useSymbol') 
    }
    l.symbol.forEach((symbol) => {
      let exDom = document.createElement('span')
      exDom.classList.add('symbol')
      if (symbol) {
        exDom.classList.add('fa', ...(symbol.split(' ').map((s) => {
          return 'fa-' + (s.replace(/^fa\-/i, ''))
        })))
      } else {
        exDom.classList.add('noSymbol')
      }
      ld.appendChild(exDom)
    })
    let t = document.createElement('span')
    t.classList.add('title')
    t.innerHTML = l.name
    ld.appendChild(t)
    ld.style.setProperty('--calendarColor', l.color)
    ld.style.setProperty('--oppositeColor', l.oppositeColor)
    lDom.appendChild(ld)
  }
  dom.appendChild(lDom)
}

export {
  uid,
  loaded,
  initModule,
  regularizeEvents,
  scheduledRefresh,
  prepareEvents,
  renderEvent,
  prepareMagic,
  displayLegend,
}