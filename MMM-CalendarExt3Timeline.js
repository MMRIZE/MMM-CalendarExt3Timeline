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
    hourLength: 24,
    hourIndexOptions: {
      hour: 'numeric',
    },
    dateIndexOptions: {
      dayStyle: 'short'
    },
    calendarSet: [],
    eventFilter: null,
    eventTransformer: null,
    useSymbol: true,
    notification: 'CALENDAR_EVENTS', /* reserved */
    maxSlots: 5,
    displayLegend: false,
  },

  getStyles: function () {
    return ['MMM-CalendarExt3Timeline.css']
  },

  start: function() {
    this.instanceId = this.config.instanceId ?? this.identifier
    this.hourLength = Math.ceil((this.config.hourLength <= 1) ? 6 : this.config.hourLength)
    this._ready = false

    let _moduleLoaded = new Promise((resolve, reject) => {
      import('/' + this.file('CX3_shared.mjs')).then((m) => {
        this.library = m
        this.library.initModule(this, config.language)
        resolve()
      }).catch((err) => {
        console.error(err)
        reject(err)
      })
    })

    let _firstData = new Promise((resolve, reject) => {
      this._receiveFirstData = resolve
    })

    let _firstFetched = new Promise((resolve, reject) => {
      this._firstDataFetched = resolve
    })

    let _domCreated = new Promise((resolve, reject) => {
      this._domReady = resolve
    })

    Promise.allSettled([_moduleLoaded, _firstData, _domCreated]).then ((result) => {
      this._ready = true
      this.library.prepareMagic()
      let {payload, sender} = result[1].value
      this.fetch(payload, sender)
      this._firstDataFetched()
    })

    Promise.allSettled([_firstFetched]).then (() => {
      setTimeout(() => {
        this.updateDom(this.config.animationSpeed)
      }, this.config.waitFetch)
      
    })
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification === this.config.notification) {
      if (this?.storedEvents?.length == 0 && payload.length > 0) {
        this._receiveFirstData({payload, sender})
      }
      if (this?.library?.loaded) {
        this.fetch(payload, sender)  
      } else {
        Log.warn('[CX3T] Module is not prepared yet, wait a while.')
      }
    }

    if (notification === 'DOM_OBJECTS_CREATED') {
      this._domReady()
    }
  },

  fetch: function(payload, sender) {
    this.storedEvents = this.library.regularizeEvents({
      storedEvents: this.storedEvents,
      eventPool: this.eventPool,
      payload,
      sender,
      config: this.config
    })
  },

  getDom: function() {
    let dom = document.createElement('div')
    dom.classList.add('bodice', 'CX3T_' + this.instanceId, 'CX3T')
    dom = this.draw(dom, this.config)
    if (this.library?.loaded) {
      this.library.scheduledRefresh({
        refreshTimer: this.refreshTimer,
        refreshInterval: this.config.refreshInterval,
        job: () => {
          this.updateDom(this.config.animationSpeed)
        }
      })
    } else {
      Log.warn('[CX3T] Module is not prepared yet, wait a while.')
    }
    return dom
  },

  draw: function (dom, config) {
    if (!this.library?.loaded) return dom
    let thisMoment = new Date()

    let startFrame = (config.staticMode) 
      ? (new Date(thisMoment.getFullYear(), thisMoment.getMonth(), thisMoment.getDate(), config.beginHour))
      : (new Date(thisMoment.getFullYear(), thisMoment.getMonth(), thisMoment.getDate(), thisMoment.getHours() + config.beginHour))
    let endFrame = new Date(new Date(startFrame).setHours(startFrame.getHours() + this.hourLength))

    let sv = startFrame.valueOf()
    let ev = endFrame.valueOf()

    let ni = Math.round((thisMoment.valueOf() - sv) / (ev - sv) * 10000) / 100

    if (ni >= 100) ni = 100

    dom.style.setProperty('--nowIndex', ni + '%')

    let events = this.library.prepareEvents({
      storedEvents: this.storedEvents,
      range: [sv, ev]
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

      let id = new Date(d.getFullYear(), d.getMonth(), d.getDate()).valueOf()

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
      if (0 < config.maxSlots && i >= config.maxSlots) continue 
      tl.classList.add('timeline', 'timeline_' + i++)
      for (let event of stack) {
        let e = this.library.renderEvent(event, {
          useSymbol: config.useSymbol
        })
        if (event.startDate < sv) e.classList.add('fromPast')
        if (event.endDate > ev) e.classList.add('toFuture')
        e.style.setProperty('--startPosition', (event.startDate <= sv) ? '0%' : Math.round((event.startDate - sv) / frameLength * 10000) / 100 + '%')
        e.style.setProperty('--endPosition', (event.endDate >= ev) ? '0%' : Math.round((ev - event.endDate) / frameLength * 10000) / 100 + '%')
        if (e) tl.appendChild(e)
      }
      lines.appendChild(tl)
    }

    dom.appendChild(lines)
    if (config.displayLegend) this.library.displayLegend(dom, events, {useSymbol: config.useSymbol})
    return dom
  },

})