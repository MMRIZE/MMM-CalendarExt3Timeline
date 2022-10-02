/* global Module */
Module.register('MMM-CalendarExt3Timeline', {
  defaults: {
    instanceId: null,
    locale: null,
    staticMode: true,
    refreshInterval: 1000 * 60,
    waitFetch: 1000 * 5,
    animationSpeed: 1000,
    beginHour: 0,
    hourLength: 48,
    hourIndexOptions: {
      hour: 'numeric',
    },
    dateIndexOptions: {
      dayStyle: 'short'
    },

    eventTimeOptions: {
      timeStyle: 'short',
    },
    calendarSet: [],
    separateCalendar: true,
    eventFilter: null,
    eventFormatter: null,
    useSymbol: true,
    notification: 'CALENDAR_EVENTS',
  },

  getStyles: function () {
    return ['MMM-CalendarExt3Timeline.css']
  },

  start: function() {
    this._moduleLoaded = new Promise((resolve, reject) => {
      import('/' + this.file('CX3_shared.mjs')).then((m) => {
        this.library = m
        this._ready = true
        resolve()
      }).catch(err => reject)
    })

    this.storedEvents = []
    this.instanceId = this.config.instanceId ?? this.identifier
    this.locale = Intl.getCanonicalLocales(this.config.locale ?? config.language )?.[0] ?? ''
    this.refreshTimer = null
    this.eventPool = new Map()
    this.hourLength = Math.ceil((this.config.hourLength <= 1) ? 6 : this.config.hourLength)
    this._ready = false
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification === this.config.notification) {
      if (this._ready) {
        this.fetch(payload, sender)  
      } else {
        Log.warn('[CX3T] Module is not prepared yet, wait a while.')
      }
    }
  },

  fetch: function(payload, sender) {
    this.eventPool.set(sender.identifier, JSON.parse(JSON.stringify(payload)))
    let calendarSet = (Array.isArray(this.config.calendarSet)) ? [...this.config.calendarSet] : []
    if (calendarSet.length > 0) {
      this.eventPool.set(sender.identifier, this.eventPool.get(sender.identifier).filter((ev) => {
        return (calendarSet.includes(ev.calendarName))
      }).map((ev) => {
        let i = calendarSet.findIndex((name) => {
          return name === ev.calendarName
        }) + 1
        ev.calendarSeq = i
        return ev
      }))
    }
    this.storedEvents = [...this.eventPool.values()].reduce((result, cur) => {
      return [...result, ...cur]
    }, [])

    if (typeof this.config.eventFilter === 'function') {
      this.storedEvents = this.storedEvents.filter(this.config.eventFilter)
    }

    if (typeof this.config.eventFormatter === 'function') {
      this.storedEvents = this.storedEvents.map(this.config.eventFormatter)
    }

    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer)
      this.fetchTimer = null
    }
    this.fetchTimer = setTimeout(() => {
      clearTimeout(this.fetchTimer)
      this.fetchTimer = null
      this.updateDom(this.config.animationSpeed)
    }, this.config.waitFetch)
  },

  getDom: function() {
    let dom = document.createElement('div')
    dom.classList.add('bodice', 'CX3T_' + this.instanceId, 'CX3T')
    dom = this.draw(dom, this.config)
    this.refreshTimer = setTimeout(() => {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
      this.updateDom(this.config.animationSpeed)
    }, this.config.refreshInterval)
    return dom
  },

  draw: function (dom, config) {
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

    const isCurrent = (ev) => {
      let tm = Date.now()
      return (ev.endDate >= tm && ev.startDate <= tm)
    }

    const isPassed = (ev) => {
      return (ev.endDate < thisMoment.valueOf())
    }

    const isFuture = (ev) => {
      return (ev.startDate > thisMomnent.ValueOf())
    }

    const isMultiday = (ev) => {
      let s = new Date(ev.startDate)
      let e = new Date(ev.endDate)
      return ((s.getDate() !== e.getDate())
        || (s.getMonth() !== e.getMonth())
        || (s.getFullYear() !== e.getFullYear()))
    }

    const thisMoment = new Date()
    let startFrame = (config.staticMode) 
      ? (new Date(thisMoment.getFullYear(), thisMoment.getMonth(), thisMoment.getDate(), config.beginHour))
      : (new Date(thisMoment.getFullYear(), thisMoment.getMonth(), thisMoment.getDate(), thisMoment.getHours() + config.beginHour))
    let endFrame = new Date(new Date(startFrame).setHours(startFrame.getHours() + this.hourLength))

    let sv = startFrame.valueOf()
    let ev = endFrame.valueOf()

    let ni = Math.round((thisMoment.valueOf() - sv) / (ev - sv) * 10000) / 100

    if (ni >= 100) ni = 100

    dom.style.setProperty('--nowIndex', ni + '%')
    
    let events = this.storedEvents.filter((evs) => {
      return !(evs.endDate <= sv || evs.startDate >= ev)
    }).sort((a, b) => {
      return (a.startDate === b.startDate) ? a.endDate - b.endDate : a.startDate - b.startDate
    })

    dom.dataset.events = events.length

    let stacks = []
    for (let event of events) {
      let availableStack = stacks.find((stack) => {
        return (!Array.isArray(stack)) ? false : stack.every((ex) => {
          return ((ex.startDate <= event.startDate)
            ? (ex.endDate <= event.startDate)
            : (ex.startDate >= event.endDate)
          )
        })
      })
      if (Array.isArray(availableStack)) {
        availableStack.push(event)
      } else {
        stacks.push([event])
      } 
      
    }
    dom.innerHTML = ''
    let magic = document.createElement('div')
    magic.classList.add('CX3T_MAGIC')
    magic.id = 'CX3T_MAGIC_' + this.instanceId
    dom.appendChild(magic)

    let lines = document.createElement('div')
    lines.classList.add('timelines')

    let frameLength = ev - sv

    // dateIndices
    let di = document.createElement('div')
    di.classList.add('indexContainer', 'dateIndices')
    
    // hourIndices
    let hi = document.createElement('div')
    hi.classList.add('indexContainer', 'hourIndices')

    let dxPool = new Map()
    for (let hx = 0; hx < this.hourLength; hx++) {
      let d = new Date(startFrame.getFullYear(), startFrame.getMonth(), startFrame.getDate(), startFrame.getHours() + hx)
      let hxd = document.createElement('div')
      hxd.classList.add('hourIndex', 'index')
      hxd.dataset.hour = d.getHours()
      hxd.innerHTML = new Intl.DateTimeFormat(this.locale, config.hourIndexOptions).formatToParts(d).reduce((prev, cur, curIndex, arr) => {
        prev = prev + `<span class="cellTimeIndexParts ${cur.type} seq_${curIndex}">${cur.value}</span>`
        return prev
      }, '')
      hi.appendChild(hxd)

      let id = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()).valueOf()

      let dx = (dxPool.has(id)) ? dxPool.get(id) : 0
      dxPool.set(id, dx + 1)
    }

    [...dxPool.entries()].sort((a, b) => {
      return a[0] - b[0]
    }).forEach((dd) => {
      let dxd = document.createElement('div')
      dxd.classList.add('dateIndex', 'index')
      dxd.dataset.datetime = dd[0]
      dxd.dataset.length = dd[1]
      dxd.style.gridColumn = 'span ' + dd[1]
      dxd.innerHTML = new Intl.DateTimeFormat(this.locale, config.dateIndexOptions).formatToParts(new Date(dd[0])).reduce((prev, cur, curIndex, arr) => {
        prev = prev + `<span class="cellDateIndexParts ${cur.type} seq_${curIndex}">${cur.value}</span>`
        return prev
      }, '')
      di.appendChild(dxd)
    })
    dom.appendChild(di)
    dom.appendChild(hi)

    let i = 0
    for (let stack of stacks) {
      let tl = document.createElement('div')
      tl.classList.add('timeline', 'timeline_' + i++)
      for (let event of stack) {
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

        if (event.startDate < sv) e.classList.add('fromPast')
        if (event.endDate > ev) e.classList.add('toFuture')
          
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
        e.style.setProperty('--startPosition', (event.startDate <= sv) ? '0%' : Math.round((event.startDate - sv) / frameLength * 10000) / 100 + '%')
        e.style.setProperty('--endPosition', (event.endDate >= ev) ? '0%' : Math.round((ev - event.endDate) / frameLength * 10000) / 100 + '%')
        e.style.setProperty('--calendarColor', event.color)

        let magic = document.getElementById('CX3T_MAGIC_' + this.instanceId)
        magic.style.color = event.color
        let l = getL(window.getComputedStyle(magic).getPropertyValue('color'))
        e.style.setProperty('--oppositeColor', (l > 60) ? 'black' : 'white')

        if (config.useSymbol && Array.isArray(event.symbol) && event.symbol.length > 0) {
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

        tl.appendChild(e)
      }
      lines.appendChild(tl)
    }

    dom.appendChild(lines)
    return dom
    



    const makeEventDataDom = (event, tm) => {
      let e = document.createElement('div')



      event.calendarName ? e.classList.add('calendar_' + encodeURI(event.calendarName)) : null
      if (event?.class) e.classList.add(event.class)
      if (event.fullDayEvent) e.classList.add('fullday')
      if (event.isPassed) e.classList.add('passed')
      if (event.isCurrent) e.classList.add('current')
      if (event.isFuture) e.classList.add('future')
      if (event.isMultiday) e.classList.add('multiday')
      if (!(event.isMultiday || event.fullDayEvent)) e.classList.add('singleday')
      if (config.useSymbol) {
        e.classList.add('useSymbol') 
      }
      e.style.setProperty('--calendarColor', event.color)
      let headline = document.createElement('div')
      headline.classList.add('headline')

      if (config.useSymbol && Array.isArray(event.symbol) && event.symbol.length > 0) {
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
          headline.appendChild(exDom)
        })
      } else {
        let exDom = document.createElement('span')
        exDom.classList.add('noSymbol', 'symbol')
        headline.appendChild(exDom)
      }

      let time = document.createElement('div')
      time.classList.add('period')

      let startTime = document.createElement('div')
      let st = new Date(event.startDate)
      startTime.classList.add('time', 'startTime')
      startTime.innerHTML = new Intl.DateTimeFormat(this.locale, config.eventTimeOptions).formatToParts(st).reduce((prev, cur, curIndex, arr) => {
        prev = prev + `<span class="eventTimeParts ${cur.type} seq_${curIndex}">${cur.value}</span>`
        return prev
      }, '')
      headline.appendChild(startTime)

      let endTime = document.createElement('div')
      let et = new Date(event.endDate)
      endTime.classList.add('time', 'endTime')
      endTime.innerHTML = new Intl.DateTimeFormat(this.locale, config.eventTimeOptions).formatToParts(et).reduce((prev, cur, curIndex, arr) => {
        prev = prev + `<span class="eventTimeParts ${cur.type} seq_${curIndex}">${cur.value}</span>`
        return prev
      }, '')
      headline.appendChild(endTime)

      let title = document.createElement('div')
      title.classList.add('title')
      title.innerHTML = event.title
      headline.appendChild(title)
      e.appendChild(headline)
      let description = document.createElement('div')
      description.classList.add('description')
      description.innerHTML = event.description || ''
      e.appendChild(description)
      let location = document.createElement('div')
      location.classList.add('location')
      location.innerHTML = event.location || ''
      e.appendChild(location)
      e.classList.add('event')

      let magic = document.getElementById('CX3T_MAGIC_' + this.instanceId)
      magic.style.color = event.color
      let l = getL(window.getComputedStyle(magic).getPropertyValue('color'))
      e.style.setProperty('--oppositeColor', (l > 60) ? 'black' : 'white')
      
      return e
    }


  },

})