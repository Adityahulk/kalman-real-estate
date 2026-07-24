export function ambeyAllotmentTemplate() {
  return `<div data-template="ambey-allotment">
<section data-ambey-page="1" data-top="700">
<h1><u>Allotment Letter</u></h1>
<p class="right meta-block"><strong>Allotment No.: {{document.number}}</strong><br><strong>({{rera.number}})</strong><br>Date: {{document.date}}</p>
<p class="recipient-block">To<br><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner.aadhaarNo}}</u><br><u>Pan No. {{owner.panNo}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>
<p class="subject-line"><strong>Subject :-</strong> <strong>Allotment Letter of Residential Plot No. {{plot.code}} ({{plot.areaSqydApprox}}) of {{project.name}}, {{project.fullAddress}}</strong></p>
<p>We thank you for your application addressed to "{{firm.name}}" (Firm) and for the payments required for the purpose of allotment.</p>
<p>It is indeed our pleasure to inform you that the unit booked by you via the application form has now been allotment to you subject to terms and conditions as stated in the Application Form.</p>
<p>The details of unit allotted and your address in our records for the purpose of correspondence are as under:-</p>
<table>
<tr><th>Name of Allottee(s)</th><td><strong>{{owner.nameWithRelationUpper}}</strong></td></tr>
<tr><th>Address of Allotee</th><td><strong>{{owner.addressUpper}}</strong></td></tr>
<tr><th>Unit No.</th><td><strong>{{plot.code}}</strong></td></tr>
<tr><th>Name of Project</th><td><strong>{{project.nameUpper}}</strong></td></tr>
<tr><th>Total Sale Price</th><td><strong>{{plot.priceInrFormatted}}/-*</strong></td></tr>
</table>
<p>We would like to take this opportunity to thank you for the trust that you have reposed in <strong>“{{firm.name}}”</strong> and assure you of our best services at all times.</p>
<p class="right first-page-signoff">Warm Regards<br><strong>{{firm.name}}</strong><br>(Authorized Signatory)</p>
</section>

<section data-ambey-page="2" data-top="660">
<h1><u>CERTIFICATE OF POSSESSION</u></h1>
<p>Physical Possession of residential <u><strong>Plot No. {{plot.code}}</strong></u> situated in <strong>{{project.name}}, {{project.fullAddress}}</strong> duly approved by {{project.approvalAuthority}} measuring {{plot.areaSqyd}} Sqyds. approx. is handed over by <u><strong>{{firm.signatory.name}} {{firm.signatory.relation}}</strong></u>, one of the authorized partner / person of the promoters with valid title land under residential/ commercial zone to <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u> as per the following details:-</p>
<div class="possession-layout">
<table class="side-grid-table possession-table">
<tr><th>SIDES</th><th>:</th><th>SIZE</th><th>ADJOINING</th></tr>
<tr><td>EAST SIDE</td><td>:</td><td>{{plot.eastSize}}</td><td>{{plot.eastAdjoining}}</td></tr>
<tr><td>WEST SIDE</td><td>:</td><td>{{plot.westSize}}</td><td>{{plot.westAdjoining}}</td></tr>
<tr><td>NORTH SIDE</td><td>:</td><td>{{plot.northSize}}</td><td>{{plot.northAdjoining}}</td></tr>
<tr><td>SOUTH SIDE</td><td>:</td><td>{{plot.southSize}}</td><td>{{plot.southAdjoining}}</td></tr>
</table>
<div class="possession-aside">
<div class="site-plan-box outline possession-plan-box"></div>
<div class="site-plan-label">SITE PLAN (NOT TO SCALE)</div>
<div class="compass"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="33" fill="none" stroke="#111827" stroke-width="1.25"/><circle cx="50" cy="50" r="27" fill="none" stroke="#111827" stroke-width="0.75"/><circle cx="50" cy="50" r="7" fill="#111827"/><polygon points="50,8 54,46 50,42 46,46" fill="#111827"/><polygon points="50,92 46,54 50,58 54,54" fill="#111827"/><polygon points="8,50 46,46 42,50 46,54" fill="#111827"/><polygon points="92,50 54,54 58,50 54,46" fill="#111827"/><line x1="50" y1="14" x2="50" y2="86" stroke="#111827" stroke-width="1.1"/><line x1="14" y1="50" x2="86" y2="50" stroke="#111827" stroke-width="1.1"/><text x="50" y="12" text-anchor="middle" font-size="8" font-weight="700" fill="#111827">N</text><text x="50" y="98" text-anchor="middle" font-size="8" fill="#111827">S</text><text x="4" y="53" font-size="8" fill="#111827">W</text><text x="90" y="53" font-size="8" fill="#111827">E</text></svg></div>
<p class="center certificate-signature"><strong>For M/s. {{firm.nameUpper}}</strong><br>(Authorized Signatory)</p>
</div>
</div>
</section>

<section data-ambey-page="3" data-top="750">
<p class="center stamp-line">(Stamp Duty Rs. {{stamp.amount}} having E-Stamp No. {{stamp.estampNo}} dated {{stamp.date}})</p>
<h1><u>SELF DECLARATION</u></h1>
<p class="declaration-intro">I, <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u>, allottee of Plot No. {{plot.code}}, measuring {{plot.areaSqyd}} Sqyds. in {{project.name}}, {{project.fullAddress}} and I undertake as under:</p>
<p class="roman-item"><span class="roman-label">(i)</span><span class="roman-text">I am allottee of a plot situated in {{project.name}} Residential Colony at {{project.fullAddress}} is developed by {{firm.name}}, {{firm.address}};</span></p>
<p class="roman-item"><span class="roman-label">(ii)</span><span class="roman-text">I undertake that if the colonizer ({{firm.name}}) change or increase the layout plan of the colony then I will not raise any objection, it will be on the sole discretion of the firm/colonizer to develop the colony.</span></p>
<p class="roman-item"><span class="roman-label">(iii)</span><span class="roman-text">I further undertake that if the colonizer ({{firm.name}}) can increase / extend the area of the colony and provide approach road, water & sewage supply etc. from their approved colony named {{project.name}}, then I will not raise any objection.</span></p>
<p class="right">Executant</p>
<p class="verification-title"><u><strong>Verification</strong></u></p>
<p class="verification-body">Verified the contents of my undertaking are true and correct to the best of my knowledge and belief, nothing has been concealed or mis-stated therein.<br>Date:</p>
<p class="right">Executant</p>
<div class="photo-box bottom-left framed-photo">Please affix<br>your<br>photograph<br>here</div>
</section>

<section data-ambey-page="4" data-top="700">
<p class="center stamp-line">(Stamp Duty Rs. {{stamp.amount}} having E-Stamp No. {{stamp.2.estampNo}} dated {{stamp.2.date}})</p>
<h1><u>CONSENT IN FAVOUR OF {{firm.nameUpper}}, {{project.city}}</u></h1>
<p class="consent-subject">Subject : Consent for change / Revision / Addition in layout plan of {{project.name}} space having Hadbast No. 55, vide Jamabandi for the year 2019-20, of Village Barnala-A, B, C &amp; D, Tehsil &amp; Distt. Barnala.</p>
<p class="salutation">Dear Sir/Madam</p>
<p class="consent-indent">We, the undersigned allottee(s) of <span class="red-text">Plot No.</span> {{plot.code}} in the project “<strong>{{project.name}}</strong>”, which is registered with Punjab RERA vide Registration No. <strong>{{rera.number}}</strong>, hereby state that the project was earlier approved as per Layout Plan No. <strong>TB/BARNALA/SA/24/01 Dated 09/12/2024</strong>. And License to Develop Colony No. <strong>BNL-UD-LDC-2025/344 Dated 13/03/2025</strong>.</p>
<p class="consent-indent">We have been informed by the promoter that the layout plan has been revised and approved vide Revised Layout Plan No. <strong>TB/BARNALA/SA/25/01</strong> <strong>Dated 11/11/2025</strong> and License to Develop Colony No. <strong>235/B</strong> <strong>Dated. 22/04/2026.</strong></p>
<p class="consent-layout-label">As per the revised layout:</p>
<p class="consent-plot-lines">* Old Plot Number: {{plot.oldCode}}<br>* New Plot Number: {{plot.newCode}}</p>
<p class="consent-block">At the time of booking of <span class="red-text">Plot No.{{plot.code}}</span> We were shown all documents of above-mentioned Residential Colony like Layout plan, etc. As we are aware that said layout plan is always subject to certain practical changes on site, which are required to be amended or revised for the exact measurements of the plots and for the betterment of the colony. As such by virtue of this letter, I/We do hereby accord and grant our unconditional consent for changes/revision or amendment in the layout plan of the Residential colony. Moreover, if the developer extends the expansion of existing Colony, the same shall be deemed to have been done with my/our consent. Hence, I/We shall not dispute the said changes/revision /amendment/addition of the layout plan of the Residential colony at any stage and grant unconditional consent regarding for any changes/revision /amendment/addition of the commercial colony.</p>
<p>Thanking you and assuring you all the assistance.</p>
<p class="right consent-signoff"><strong>(Allottee/ Allottees)</strong></p>
</section>

<section data-ambey-page="5" data-top="760" class="agreement-page" data-reflow="agreement">
<h2><u>{{firm.nameUpper}}, {{firm.address}}</u><br>PLOT BUYERS' AGREEMENT {{project.nameUpper}}</h2>
<p class="regulatory-note"><em><u>This residential Housing Project has been approved by issuing the License to Develop Colony by The Competent Authority cum Additional Deputy Commissioner (General), {{project.city}}, vide License No. BNL-UDC-2025/344 dated 13.03.2025 and also approved by issuing the License to Develop Colony by Municipal Corporation, {{project.city}}, vide License No. 235/B dated 22.04.2026. Further said colony has been approved by Punjab Real Estate Regulatory Authority (RERA) vide Registration No. PBREAR-BNL06-PR1384-062026 dated 11.06.2026.</u></em></p>
<p class="center stamp-line">(Stamp Duty Rs. {{stamp.amount}} having E-Stamp No. {{stamp.3.estampNo}} dated {{stamp.3.date}})</p>
<p class="agreement-opening">THIS AGREEMENT made at {{agreement.place}} on this {{ownership.effectiveDayOrdinal}} day of {{ownership.effectiveMonth}}, {{ownership.effectiveYear}}.</p>
<p class="center">BETWEEN</p>
<p class="agreement-party"><strong>{{firm.nameUpper}}**</strong>, {{firm.address}} (hereinafter referred to as the 'Firm', which expression shall unless excluded by or repugnant to the subject or context be deemed to include its executors and authorized vide its permitted assigns) through it's duly Authorized Signatory vide authority letter dated {{firm.signatory.authorizationDate}} of the One Part;</p>
<p class="agreement-note"><em>**M/s. {{firm.name}}, {{firm.address}} a partnership firm duly registered under the Indian Partnership Act, 1932 acting through its partner {{firm.signatory.name}} {{firm.signatory.relation}} authorized vide authority letter dated {{firm.signatory.authorizationDate}}.</em></p>
<p class="center">AND</p>
<div class="photo-box right-mid framed-photo">Please affix<br>photograph of<br>allottee /<br>purchaser</div>
<p class="buyer-block"><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner.aadhaarNo}}</u><br><u>Pan No. {{owner.panNo}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>
<p class="buyer-note"><em>(hereinafter referred to as the *Allottee' which expression shall, unless excluded by or repugnant to the subject or context be deemed to include his/their heirs, executors, administrators, legal representatives, nominees, and assigns of the Other Part.</em></p>
<p><strong>AND WHEREAS</strong> M/S. {{firm.nameUpper}}, entered into arrangements / collaborations with the Land Owners to develop, market and sell Plots in the said Residential Housing Project under the Brand Name "{{project.name}}" in the <strong>revenue estate of Hadbast No. 55, Village Barnala A, B, C &amp; D situated at Near Gaushalla, Raikot Road, Barnala, Distt. Barnala, Punjab 148101</strong> being developed on the aforesaid land (hereinafter referred to as then "Said Colony').</p>
<p><strong>AND WHEREAS</strong> The Firm by virtue of the said sale by {{firm.nameUpper}} is entitled to and is competent to construct, develop, market and sell plots in the said colony, receive monies, give receipts, execute conveyance, other documents etc. as may be necessary and expedient to give effect to the aforesaid purpose, for the purpose of construction and sale of plots.</p>
</section>

<section data-ambey-page="6" data-top="760" class="agreement-page" data-reflow="agreement">
<p><strong>AND WHEREAS</strong> the Said Colony is proposed to be set up in accordance with the terms and conditions of the said licenses and layout plan presently approved by competent authority and as may be approved in future by the competent authority.</p>
<h2>ALLOTTEE’S REPRESENTATIONS</h2>
<p><strong>AND WHEREAS</strong> the Allottee has applied for purchase and the firm has agreed to sell to the Allottee Plot bearing no. {{plot.code}} and measuring {{plot.areaSqyd}} (Sq yds. approx.) in the Said Colony and on the terms and conditions appearing hereinafter.</p>
<p><strong>AND WHEREAS</strong> the Allottee hereby confirm(s) and represent(s) that he/they is/are executing this Agreement with the full knowledge that the demarcation and zoning plans for the Said Plot/Said Colony may further be changed and substituted by other layout plan (s) as and when sanctioned / approved by the Competent Authority in which event the number of the Said Plot, its location, size as provisionally allotted to the Allottee may change and be substituted by a new number, location, size etc.; to which the Allottee has/have confirmed that he/they shall have no objection having been informed of this eventuality. The Allottee also agrees to abide by the terms and conditions of this Agreement including those relating to payment of Total Price, Govt. Charges including other charges and other amounts including delayed interest, taxes, etc. as laid down herein.</p>
<p><strong>AND WHEREAS</strong> the Allottee represents and confirms that the Allottee has satisfied himself about the competence of the Firm to execute this Agreement, seen all relevant documents, title deeds, License(s), approved layout plan etc., and has also familiarized himself / herself with the dimensions and other details of the said plot and also understood all limitations and obligations of the Firm and the Allottee in respect thereof and the Allottee has confirmed that his investigations are completed in all respects.</p>
<p><strong>NOW THIS AGREEMENT WITNESSETH AND IT IS HERE BY AGREED AND DECLARED BY AND BETWEEN THE PARTIES HERETO AS FOLLOWS:</strong></p>
</section>

<section data-ambey-page="7" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="clause-heading-only"><span class="clause-heading-number"><strong>1.</strong></span><span class="clause-heading-text"><strong>DETAILS OF PRICE PAYABLE FOR THE SAID PLOT</strong></span></p>
<p class="clause-follow">The Allottee has agreed to purchase from the Firm and the Firm has agreed to sell to the Allottee, the Said Plot in the Said Colony as per details given below at the rate of <u><strong>Rs. {{plot.bspRate}}/- per Sq yds.</strong></u> being the Basic Selling Price (hereinafter referred to as 'BSP') exclusive of other payments as below:-</p>
<p><u><strong>DETAILS OF PRICING:</strong></u></p>
<table class="pricing-table">
<tr><td>Plot No.</td><td>:</td><td><strong>{{plot.code}}</strong></td></tr>
<tr><td>Plot Area</td><td>:</td><td><strong>{{plot.areaSqyd}} Sq. Yds. approx.</strong></td></tr>
<tr><td>Total BSP</td><td>:</td><td><strong>{{plot.priceInrFormatted}}/-</strong></td></tr>
</table>
<p><strong>(Rupees {{plot.priceInrWords}} Only)</strong></p>
<p><strong>DETAILS OF PAYMENTS RECEIVED:</strong></p>
<table class="payments">
<tr><th>Cheque No./<br>RTGS/NEFT</th><th>Date of Cheque</th><th>Amount</th><th>Drawn on Bank</th></tr>
</table>
<p>The allottee / vendee shall pay to the promoters / colonizers on prorata basis, the price of said plot, if the dimensions of the said plot increase.</p>
<p>The colonizers /promoters promise to adjust on prorate basis, the price of plot, if the dimensions of the said plot and hence the area decreases.</p>
<p>In addition to the Total Price as mentioned above, the Allottee will be liable and agrees to pay club house which will be built by the firm, the firm have right to charge maintenance and the firm also reserve right to demand membership fee, these charges will be decided by the firm from time to time.</p>
<p class="subclause-item"><span class="subclause-label">i)</span><span class="subclause-text">Stamp duty and registration charges, legal charges etc. which shall be at actuals.</span></p>
<p class="subclause-item"><span class="subclause-label">ii)</span><span class="subclause-text">All kind of taxes and Cess including but not limited to GST.</span></p>
<p class="subclause-item"><span class="subclause-label">iii)</span><span class="subclause-text">Plot for which amount the Firm hereby acknowledges the receipts.</span></p>
</section>

<section data-ambey-page="8" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>2.</strong></span><span class="clause-heading-text"><strong>MODE OF PAYMENT</strong></span></span><span class="clause-body">The Allottee hereby agrees to make all payments by A/c Payee cheque(s)/Demand Draft(s) payable at {{project.city}} drawn in favour of "{{firm.paymentName}}"</span></p>
<p class="clause-heading-only"><span class="clause-heading-number"><strong>3.</strong></span><span class="clause-heading-text"><strong>RESTRICTIONS ON THE OWNERSHIP RIGHTS OF THE ALLOTTEE, CONSTRUCTION ACTIVITIES OUTSIDE THE SAID COLONY, CLUB ETC.</strong></span></p>
<p class="subclause-item"><span class="subclause-label">(a)</span><span class="subclause-text">The firm has calculated the Total Price payable by the Allottee for the Said Plot on the basis of the total area of the Said Plot only. The Allottee confirms and represents that the Allottee has not made any payment to the Firm in any manner whatsoever and that the Firm has not indicated / promised / represented / given any impression of any kind in any explicit or implicit manner whatsoever, that the Allottee shall have any right, title or interest of any kind whatsoever in any lands, areas, facilities and amenities falling outside the said plot.</span></p>
<p class="subclause-item"><span class="subclause-label">(b)</span><span class="subclause-text">The Firm has made clear to the Allottee that the Firm shall be carrying out extensive developmental/construction activities for many years in future in the entire area falling inside/outside the Said Colony in which Said Plot is located and that the Allottee on being aware of this fact by the Firm has confirmed that the Allottee shall not raise any objections or make any claims or default in any payments as demanded by the Firm on account of Inconvenience, if any, which may be suffered by the Allottee due to such developmental/ Construction/ Extension or its incidental/related activities.</span></p>
</section>

<section data-ambey-page="9" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="subclause-item"><span class="subclause-label">(c)</span><span class="subclause-text">The allottee/vendee shall not transfer the said plot / site to any other person / persons, unless 100% dues are paid / cleared in respect of the said plot. Transfer of Plot on the basis of allotment letter shall be permitted subject to payment of Transfer Fee as prescribed by the Firm from time to time.</span></p>
<p class="subclause-item"><span class="subclause-label">(d)</span><span class="subclause-text">It is made clear by the Firm and agreed by the Allottee that all rights including the ownership thereof of land(s), facilities and amenities (other than those specifically earmarked as common areas and facilities for common use of the occupants within the Said Colony) shall vest solely with the Firm and the Firm shall have the sole and absolute authority to deal with the same in any manner including but not limited to creation of further rights in favour of any other party by way of sale, transfer, lease, collaboration, joint venture, operation and management or any other mode including transfer to any person, institution, trust, government, semi-government, any other authority, body and/or any local body(ies) which the Firm may deem fit in its sole discretion. It is made clear by the Firm to the Allottee that the Firm has not at any time made any commitment or charged any price from the Allottee for the ownership of any amenities/facilities which are specifically earmarked by the Firm for the Firm's ownership, though the Firm may permit the occupants of the Said Colony to use such amenities and facilities upon payment of applicable charges, fees, subscription charges, security deposit etc. as may be decided by the Firm/management of such amenities and facilities from time to time.</span></p>
<p class="subclause-item"><span class="subclause-label">(e)</span><span class="subclause-text">The Firm relying on these specific undertakings of the Allottee has agreed to allot the Said Plot and the Allottee confirms that these undertakings shall survive throughout the occupancy of the Said Plot by the Allottee, Allottee's legal representatives, successors, administrators, executors, assigns, nominees, subsequent transferees, etc., and accordingly the Allottee agrees to incorporate these conditions in the sale deed with the subsequent transferee(s).</span></p>
<p class="subclause-item"><span class="subclause-label">(f)</span><span class="subclause-text">It is made clear by the firm that the Allottee or Purchaser cannot split the plot nor he can convert the residential plot for commercial use.</span></p>
<p class="subclause-item"><span class="subclause-label">(g)</span><span class="subclause-text">Amalgamation of two plot (not more than two) shall be permitted only under special circumstances subject to the discretion and approval of the firm bye laws, purely on the strength of the merits of the case pleaded by the allottee and if and only if the urban Scene/street picture is not disturbed with such amalgamation.</span></p>
<p class="subclause-item"><span class="subclause-label">(h)</span><span class="subclause-text">Any variation in the size and or the area of the said plot shall not vitiate the terms of allotment.</span></p>
</section>

<section data-ambey-page="10" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="subclause-item"><span class="subclause-label">(i)</span><span class="subclause-text">The building on the said site / plot allotted to you shall be constructed in accordance with the plans which confirm to the building bye laws, zoning plans, frame controls & architectural controls, whichever applicable, provided the building is completed in accordance with the building plans duly sanctioned by the Municipal Corporation, {{project.city}} to the total satisfaction of the colonizer / Promoters of said colony.</span></p>
<p class="subclause-item"><span class="subclause-label">(j)</span><span class="subclause-text">The allottee/vendee shall get the building plan duly approved from M. C. {{project.city}} within three years w.e.f. the date of allotment letter/title deed and submit a copy of the sanctioned plan to the office of the Promoters for their records.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>4.</strong></span><span class="clause-heading-text"><strong>ZONING PLAN RESTRICTIONS</strong></span></span><span class="clause-body">It is abundantly made clear to the Allottee that in the zoning plan as may be approved by the Competent Authority(ies), there would be restrictions including but not limited to the ramp and front gate of the plot will be constructed as per the approved plan by the competent authority(ies). Further the Allottee specifically undertake(s) to strictly abide by all norms and conditions of the zoning plan/layout plan/building plan, notifications, rules, bye-laws and/or any other approvals granted by the competent authority(ies) in respect of the Said plot/Said Colony, as may be applicable from time to time. It is specifically made clear to the Allottee that the approval of the building plan(s), occupation certificate etc., shall be at the sole cost and responsibility of the Allottee and the Firm shall have no role in the same whatsoever.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>5.</strong></span><span class="clause-heading-text"><strong>GOVT. CHARGES AND TAXES</strong></span></span><span class="clause-body">It is made abundantly clear that all the Govt. Charges, are solely to the account of the Allottee and the Firm shall have no liability in this regard. Further it is made known to the Allottee that the Government of Punjab may also levy other charges at any stage including upon the completion of the Said Colony or thereafter, the demand for which will be raised by the Firm and the Allottee undertake(s) to pay the same on demand to the Firm. Apart from the above demand as stated, for the sake of clarity, it is emphasized and understood by the Allottee that there could be future levies/ increases in the Govt. Charges, levies, during the occupation of the Said Plot and the same shall be charged and the Allottee agree(s) to be liable and pay all such future levies/increases as and when demanded by the Firm and this undertaking by the Allottee shall always survive the conveyance of the Said Plot in favour of the Allottee. The Purchaser/Allottee will get no due certificate from the firm at the time of execution of the sale deed in his favour.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>6.</strong></span><span class="clause-heading-text"><strong>ESSENCE OF THE AGREEMENT</strong></span></span><span class="clause-body">The payment on or before the due date, of Total Price and other amounts payable as per the payment plan, as accepted by the Allottee or as demanded by the Firm from time to time is the essence of this Agreement.</span></p>
</section>

<section data-ambey-page="11" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>7.</strong></span><span class="clause-heading-text"><strong>LAYOUT PLAN CHANGES</strong></span></span><span class="clause-body">The Firm has informed the Allottee that the Said Colony is planned to be developed by a Firm in accordance with the layout plan sanctioned by the competent authority and as maybe changed from time to time by the competent authority. Any changes modifications amendments as may be made by the competent authority in the layout plan for the Said Colony in future, shall automatically supersede the present approved layout plan and become binding on the Firm and the Allottee. The Allottee hereby confirm(s) that the Allottee shall have no objection if the Firm makes suitable and necessary alterations in the layout plan, if found necessary. And such alterations may involve the change in the position/number/dimensions/size or change in the area of the Said Plot etc.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>8.</strong></span><span class="clause-heading-text"><strong>DELIVER OF POSSESSION DUE TO LEGISLATION, ORDERS, RULES, REGULATIONS OF THE GOVT.</strong></span></span><span class="clause-body">The Allottee agree(s) that, if as a result of any legislation, orders or rules or regulations made or issued by the Govt. and/or any other Authority or if Competent Authority(ies) refuses, delays withholds, denies the grant of necessary approvals for the Said Plot/Said Colony or if any matters, issues relating to such approvals, permissions, notices, notifications by the Competent Authority(ies) become subject matter of any suit/writ before a Competent Court or due to force majeure (clause 34) conditions, the firm after provisional and/or final allotment is unable to deliver possession of the Said Plot to the Allottee and the Firm if it decides, in its sole discretion, to abandon the development of the Said Colony, then in that event the Allottee hereby authorize(s) the Firm to refund the amounts received from the Allottee without any interest and the Allottee hereby confirm(s) that he/they shall not make any other claim on the Firm whatsoever.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>9.</strong></span><span class="clause-heading-text"><strong>MAINTENANCE AND UP KEEP OF THE SAID COLONY</strong></span></span><span class="clause-body">The firm may enter into a maintenance agreement in future for the upkeep of the said colony. The Allottee also agree(s) to enter into a maintenance agreement at the rate stipulated by the firm in the future with the Firm/its nominee agency or any Other body Residential Welfare Association (RWA) (hereinafter referred to as the 'Maintenance Agency) as may be appointed by the Firm from time to time for the maintenance and upkeep of the Said Colony until these are handed over to local body or any government agency or association. It is made clear to the Allottee that the Maintenance Agency shall render maintenance services only with respect to the common areas falling within the Said Colony but outside the Said Plot and these shall mainly relate to services in respect to the public roads, landscaping, sewerage, drainage, garbage clearance, water, street lights, pavements, horticulture etc. The Allottee undertake(s) to pay the maintenance bills including water charges raised by the Maintenance Agency for maintaining various services/facilities as described above, raised on a pro rata basis from the date of the offer of possession by the Firm irrespective whether the Allottee has taken possession or is in occupation of the Said Plot or not, until the maintenance services are handed over to the government or any local body for maintenance.</span></p>
</section>

<section data-ambey-page="12" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>10.</strong></span><span class="clause-heading-text"><strong>NOMINATIONS</strong></span></span><span class="clause-body">Upon payment of monies and transfer charges as applicable from time to time, and subject to applicable laws and notifications or any directions/orders, etc. of any Government/or statutory authority as may be in force and upon receiving a written request from the Allottee, permit the Allottee to get the name of the Allottee/any of the Allottee's nominees'/transferees', substituted in the Allottee's place subject to such terms and conditions as the Firm may impose. The Allottee shall be solely responsible and liable for all legal, monetary or any other consequences that may arise from such nominations. It is specifically made clear to the Allottee that, as understood by the Firm, at present there are no restrictions imposed by the competent authority(ies) to restrict any nomination/ transfer he event of any imposition/transfer/ assignment of allotted Plots. However, in the event of any restrictions at any time after the date of this Agreement restricting the nomination/ transfer/ assignment of allotted Plot by any authority, the Firm will have to comply with the same and the Allottee has specifically noted the same.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>11.</strong></span><span class="clause-heading-text"><strong>LOAN FROM THE BANKS AND FINANCIAL INSTITUTIONS FOR EXECUTION OF SALE DEED</strong></span></span><span class="clause-body">In Case the Allottee wants to avail of a loan facility from financing bodies to facilitate the purchase of the said plot then:</span></p>
<p class="subclause-item"><span class="subclause-label">(a)</span><span class="subclause-text">It is clearly understood and so agreed by and between the parties hereto that all the provisions contained herein and the obligations arising any hereunder in respect of the said plot shall equally be applicable to and enforceable against any and all future Buyers/ Assignees of the said plot, as the said obligations go along with the said plot for all intents and purposes, subject to the provisions mentioned in clause.</span></p>
</section>

<section data-ambey-page="13" data-top="760" class="agreement-page" data-reflow="agreement">
<p class="subclause-item"><span class="subclause-label">(b)</span><span class="subclause-text">First allottee is bound to pay transfer fee of Rs, 5,100/- for first transfer to the firm. Second allottee is bound to pay transfer fee of Rs. 11,000/- to firm for second transfer and third allottee is bound pay the transfer fee of Rs. 21,000/- to firm for third transfer.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>12.</strong></span><span class="clause-heading-text"><strong>LAWS OF LNDIA</strong></span></span><span class="clause-body">The rights and obligations of the parties under or arising out of this Agreement shall be construed and enforced in accordance with the laws of India.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>13.</strong></span><span class="clause-heading-text"><strong>TRANSFER OF OWNERSHIP OF THE SAID COLONY</strong></span></span><span class="clause-body">The Allottee agrees that the Firm shall have the right to transfer ownership of the Said Colony in whole or in parts to any other entity such as any partnership firm, body corporate(s) whether incorporated or not, association or agency by way of sale/ disposal /or any other arrangement as may be decided by the Firm without any intimation, written or otherwise to the Allottee and the Allottee shall not raise any objection in this regard.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>14.</strong></span><span class="clause-heading-text"><strong>RIGHT TO AMEND TERMS AND CONDITIONS</strong></span></span><span class="clause-body">The Allottee agrees and understands that the terms and conditions of the Agreement may be modified / amended by the Firm in accordance with any directions/order of any court of law, Governmental Authority, in compliance with applicable law and such amendment shall be binding on the Allottee. The Firm further reserves the right to correct, modify, amend or change all the annexure attached to this Agreement and also annexure which are indicated to be tentative at any time prior to the execution of the Sale Deed of the Said Plot.</span></p>
<p class="clause-block"><span class="clause-heading"><span class="clause-heading-number"><strong>15.</strong></span><span class="clause-heading-text"><strong>DISPUTE RESOLUTION BY ARBITRATION</strong></span></span><span class="clause-body">All or any disputes arising out or touching upon or in relation to the terms of this Agreement including the interpretation and validity of the terms thereof and the respective rights and obligations of the parties shall be settled amicably by mutual discussion failing which the same shall be settled through arbitration. The arbitration proceedings shall be governed by Arbitration and Conciliation Act, 1996 or any statutory amendments/modifications thereof for the time being in force. The arbitration proceedings shall be appointed be held at an appropriate location at {{project.city}} by a Sole Arbitrator who shall be appointed by the firm. The Allottee hereby confirms that the Allottee shall have no objection to such appointment by the firm and have any doubts about the impartiality of sole arbitrator, appointed by the firm.</span></p>
</section>

<section data-ambey-page="14" data-top="760" class="agreement-page" data-reflow="agreement">
<div class="closing-block">
<p class="closing-intro"><strong>IN WITNESS WHEREOF</strong>, the parties hereto have set and subscribed their respective hands at the places and on the day, month and year mentioned under their respective signatures</p>
<p class="closing-title"><u><strong>SIGNED AND DELIVERED BY THE WITH IN NAMED</strong></u><br>Allottee (including joint allottees)</p>
<table class="signature-lines">
<tr><td>(1) NAME: {{owner.nameWithRelation}}</td><td>SIGNATURE</td></tr>
<tr><td>(2) NAME: ________________________</td><td>SIGNATURE</td></tr>
</table>
<p class="closing-meta">At {{witness.place}} on {{ownership.effectiveDateDots}}</p>
<p class="closing-subtitle">In the presence of:</p>
<p class="closing-witness-title"><strong>WITNESSES:</strong></p>
<div class="closing-witness-layout">
<div class="closing-witness-row">
<div class="closing-witness-entry">
<p class="closing-witness-line"><span class="closing-witness-label">i) Name:</span><span class="closing-witness-fill">{{witness.1.name}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Address:</span><span class="closing-witness-fill">{{witness.1.address}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Contact:</span><span class="closing-witness-fill">{{witness.1.phone}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Signature:</span><span class="closing-witness-fill">&nbsp;</span></p>
</div>
<div class="closing-photo-box"></div>
</div>
<div class="closing-witness-row">
<div class="closing-witness-entry">
<p class="closing-witness-line"><span class="closing-witness-label">ii) Name:</span><span class="closing-witness-fill">{{witness.2.name}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Address:</span><span class="closing-witness-fill">{{witness.2.address}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Contact:</span><span class="closing-witness-fill">{{witness.2.phone}}</span></p>
<p class="closing-witness-line"><span class="closing-witness-label">Signature:</span><span class="closing-witness-fill">&nbsp;</span></p>
</div>
<div class="closing-photo-box"></div>
</div>
</div>
<p class="closing-firm-title"><strong>SIGNED AND DELIVERED BY THE WITHIN NAMED {{firm.signatory.name}} {{firm.signatory.relation}}</strong></p>
<p class="closing-firm-note">For and on behalf of Firm {{firm.name}} {{project.cityState}} at {{document.place}} on {{ownership.effectiveDateDots}}.</p>
</div>
</section>
</div>`;
}

// Joint / partnership allotment letter — exact port of the "Allotment Ambey Homes Double"
// reference PDF: two allottees throughout (To block, two-column details table with a Share row,
// possession/declaration naming both, two photograph boxes, a second buyer block in the
// agreement, and the (2) NAME line in the closing). The agreement clauses are identical to the
// single-allottee letter. Second-allottee values come from the owner2.* snapshot variables
// (extraDetails.secondAllottee on the allotment record).
export function ambeyAllotmentJointTemplate() {
  const single = ambeyAllotmentTemplate();

  // Deriving from the single template keeps the (identical) agreement clauses in lock-step, but a
  // plain .replace silently no-ops if the single template drifts — throw instead, so a drift is a
  // loud build/test failure rather than a silently-wrong legal letter.
  function mustReplace(haystack: string, needle: string, replacement: string) {
    if (!haystack.includes(needle)) {
      throw new Error(`ambeyAllotmentJointTemplate: single-template anchor missing: ${needle.slice(0, 60)}…`);
    }
    return haystack.replace(needle, replacement);
  }

  // Page 1: recipient block names both allottees (the reference's page 1 lists names + addresses
  // only, joined by "and"); the details table gains a second value column and a Share row.
  let joint = mustReplace(single,
    `<p class="recipient-block">To<br><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner.aadhaarNo}}</u><br><u>Pan No. {{owner.panNo}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>`,
    `<p class="recipient-block">To<br><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br>and<br><u>{{owner2.nameWithRelation}}</u><br><u>resident of {{owner2.addressMultilineHtml}}</u></p>`,
  );
  joint = mustReplace(joint,
    `<table>
<tr><th>Name of Allottee(s)</th><td><strong>{{owner.nameWithRelationUpper}}</strong></td></tr>
<tr><th>Address of Allotee</th><td><strong>{{owner.addressUpper}}</strong></td></tr>
<tr><th>Unit No.</th><td><strong>{{plot.code}}</strong></td></tr>
<tr><th>Name of Project</th><td><strong>{{project.nameUpper}}</strong></td></tr>
<tr><th>Total Sale Price</th><td><strong>{{plot.priceInrFormatted}}/-*</strong></td></tr>
</table>`,
    `<table>
<tr><th>Name of Allottee(s)</th><td><strong>{{owner.nameWithRelationUpper}}</strong></td><td><strong>{{owner2.nameWithRelationUpper}}</strong></td></tr>
<tr><th>Address of Allottee(s)</th><td><strong>{{owner.addressUpper}}</strong></td><td><strong>{{owner2.addressUpper}}</strong></td></tr>
<tr><th>Unit No.</th><td><strong>{{plot.code}}</strong></td><td><strong>{{plot.code}}</strong></td></tr>
<tr><th>Share</th><td><strong>{{owner.share}}</strong></td><td><strong>{{owner2.share}}</strong></td></tr>
<tr><th>Name of Project</th><td><strong>{{project.nameUpper}}</strong></td><td><strong>{{project.nameUpper}}</strong></td></tr>
<tr><th>Total Sale Price</th><td><strong>{{plot.priceInrFormatted}}/-*</strong></td><td><strong>{{plot.priceInrFormatted}}/-*</strong></td></tr>
</table>`,
  );

  // Page 2: possession is handed over to both allottees.
  joint = mustReplace(joint,
    `to <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u> as per the following details:-`,
    `to <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u> and <u><strong>{{owner2.nameWithRelation}} resident of {{owner2.address}}</strong></u> as per the following details:-`,
  );

  // Page 3: both allottees declare; the reference carries two photograph boxes.
  joint = mustReplace(joint,
    `<p class="declaration-intro">I, <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u>, allottee of Plot No.`,
    `<p class="declaration-intro">I, <u><strong>{{owner.nameWithRelation}} resident of {{owner.address}}</strong></u> and <u><strong>{{owner2.nameWithRelation}} resident of {{owner2.address}}</strong></u>, allottee of Plot No.`,
  );
  joint = mustReplace(joint,
    `<div class="photo-box bottom-left framed-photo">Please affix<br>your<br>photograph<br>here</div>`,
    `<div class="photo-box bottom-left framed-photo">Please affix<br>your<br>photograph<br>here</div>
<div class="photo-box right framed-photo">Please affix<br>your<br>photograph<br>here</div>`,
  );

  // Agreement: a second buyer block joined by "and", and a second photograph box.
  joint = mustReplace(joint,
    `<div class="photo-box right-mid framed-photo">Please affix<br>photograph of<br>allottee /<br>purchaser</div>
<p class="buyer-block"><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner.aadhaarNo}}</u><br><u>Pan No. {{owner.panNo}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>`,
    `<div class="photo-box right-mid framed-photo">Please affix<br>photograph of<br>allottee /<br>purchaser</div>
<p class="buyer-block"><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner.aadhaarNo}}</u><br><u>Pan No. {{owner.panNo}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>
<p class="center">and</p>
<div class="photo-box right-mid framed-photo">Please affix<br>photograph of<br>allottee /<br>purchaser</div>
<p class="buyer-block"><u>{{owner2.nameWithRelation}}</u><br><u>Resident of {{owner2.addressMultilineHtml}}</u><br><u>Aadhaar No. {{owner2.aadhaarNo}}</u><br><u>Pan No. {{owner2.panNo}}</u><br><u>Mobile No. {{owner2.mobileNo}}</u></p>`,
  );

  // Closing: the second joint allottee signs on the (2) NAME line.
  joint = mustReplace(joint,
    `<tr><td>(2) NAME: ________________________</td><td>SIGNATURE</td></tr>`,
    `<tr><td>(2) NAME: {{owner2.nameWithRelation}}</td><td>SIGNATURE</td></tr>`,
  );

  return joint.replace('<div data-template="ambey-allotment">', '<div data-template="ambey-allotment" data-template-variant="joint">');
}

export function transferLetterTemplate() {
  return `<div data-letter-template="transfer-letter">
<section data-letter-page="1" data-top="760">
<p>Date: {{document.date}}</p>
<p class="transfer-to-block">To,<br><span class="transfer-to-firm"><strong>M/S. {{firm.nameUpper}},</strong></span><br><span class="transfer-to-firm"><strong>{{project.name}}, {{project.fullAddress}}</strong></span></p>
<p class="transfer-subject"><span>Subject&nbsp;&nbsp;&nbsp;:</span><span>Transfer of Residential Plot No. <strong>{{plot.code}}</strong> situated in <strong>{{project.name}}</strong> situated at <strong>{{project.fullAddress}}</strong>.</span></p>
<p>Respected Sir,</p>
<p>I, <strong>{{seller.nameWithRelation}}</strong> has been allotted residential Plot No. <strong>{{plot.code}}</strong> measuring <strong>{{plot.areaSqyd}}</strong> Square Yards at <strong>{{project.name}}</strong> of <strong>M/s. {{firm.name}}, {{firm.address}}</strong> vide allotment letter No. <strong>{{original.allotmentNumber}}</strong> dated <strong>{{original.allotmentDate}}</strong>. I/we seek your permission to transfer the above stated plot in favor of:</p>
<p class="center transfer-party"><u><strong>{{owner.nameWithRelation}}</strong></u><br>{{owner.addressMultilineHtml}}<br>PAN No. {{owner.panNo}}<br>Aadhaar No. {{owner.aadhaarNo}}</p>
<p>The conveyance deed in respect of the plot has been / not yet been executed. The said plot is free from all encumbrances like mortgages, gift or transfer in any manner to any person(s)/body.</p>
<p>I/we hereby declare that nothing has been concealed in the above information and the residential plot is vacant. If in future, it is found that the transfer has been affected on the basis of false/wrong information provided in the application the transfer shall be deemed to be null and void and all consequent losses i.e. legal or financial shall be born by us. In case company suffers any loss on account of this transfer or as a consequence of this transfer myself/ourselves, legal heirs and successors of myself/ourselves shall be liable to make good all the losses or expenses sustained/suffered by the company or its employees. In case any legal heirs or successor or other person makes any claim regarding this residential plot, the litigation of the same shall be defended by me/us and the loss/expenses sustained/suffered by the company will also be made good by myself/ourselves.</p>
</section>

<section data-letter-page="2" data-top="760">
<p>The name, address and specimen signatures of the 1st transfer holder(s) as attested by me/us are as below:-</p>
<table class="holder-table">
<tr><th>Sr. No.</th><th>Name</th><th>Address</th><th>Signature</th></tr>
<tr><td>1.</td><td>{{owner.nameWithRelation}}</td><td>{{owner.address}}</td><td>&nbsp;</td></tr>
</table>
<p>Signature of the 1st Allotee _________________________________________________</p>
<p>Thanking You,<br>Yours Faithfully</p>
<p><strong>Submitted by<br>({{seller.nameWithRelation}})</strong></p>
</section>

<section data-letter-page="3" data-top="760">
<p class="center">(Stamp Duty Rs. {{stamp.amount}}/- having E-Stamp No. {{stamp.estampNo}} dated {{stamp.date}})</p>
<p class="transfer-heading">AFFIDAVITE</p>
<p>I, <strong>{{seller.nameWithRelation}}</strong> do solemnly declare and affirm as under: -</p>
<div class="num-list">
<p class="num-item"><span>1.</span><span>That I am the first allotee of residential plot no. <strong>{{plot.code}}</strong> measuring <strong>{{plot.areaSqyd}}</strong> Square Yards situated at <strong>{{project.name}}</strong> vide allotment letter no. <strong>{{original.allotmentNumber}}</strong> dated <strong>{{original.allotmentDate}}</strong>.</span></p>
<p class="num-item"><span>2.</span><span>That I have sold the above plot to <strong>{{owner.nameWithRelation}}</strong>.</span></p>
<p class="num-item"><span>3.</span><span>That neither I or our legal heirs or successors shall not be concerned with this plot after this transfer.</span></p>
<p class="num-item"><span>4.</span><span>That I shall be liable to make good any loss or damages sustained by company due to transfer made on false information provided by us.</span></p>
<p class="num-item"><span>5.</span><span>That I undertake to pay all the dues, if any towards the company.</span></p>
<p class="num-item"><span>6.</span><span>That in case any dispute arises, we shall stand responsible for the same.</span></p>
</div>
<p class="deponent">Deponent</p>
<p class="transfer-heading">VERIFICATION</p>
<p>I, <strong>{{seller.nameWithRelation}}</strong> verify that the contents of the above affidavit are true and correct to the best of my knowledge and nothing has been concealed therein.</p>
<p class="deponent">Deponent</p>
</section>

<section data-letter-page="4" data-top="760">
<p class="center">(Stamp Duty Rs. {{stamp.amount}}/- having E-Stamp No. {{stamp.2.estampNo}} dated {{stamp.2.date}})</p>
<p class="transfer-heading">AFFIDAVITE</p>
<p>I, <strong>{{owner.nameWithRelation}}</strong> does hereby solemnly declare and affirm as under:</p>
<div class="num-list">
<p class="num-item"><span>1.</span><span>That I have purchased plot no. <strong>{{plot.code}}</strong> measuring <strong>{{plot.areaSqyd}}</strong> Sq. Yds. situated at <strong>{{project.nameUpper}}</strong> from <strong>{{seller.nameWithRelation}}</strong>.</span></p>
<p class="num-item"><span>2.</span><span>That I accept the allotment of residential plot no. <strong>{{plot.code}}</strong> measuring <strong>{{plot.areaSqyd}}</strong> Sq. Yds. situated at <strong>{{project.nameUpper}}</strong> of the firm.</span></p>
<p class="num-item"><span>3.</span><span>That I further undertake to make payment of all the outstanding dues i.e. taxes/cess if any in respect of the above plot.</span></p>
<p class="num-item"><span>4.</span><span>That I accept all the terms and condition relating to the allotment of residential plot, of the company as provided in the allotment letter no. <strong>{{original.allotmentNumber}}</strong> dated <strong>{{original.allotmentDate}}</strong>.</span></p>
<p class="num-item"><span>5.</span><span>That I undertake to abide all the terms and conditions of RERA / PUDA / <span class="red-text">Municipal Corporation, {{project.city}}</span>.</span></p>
</div>
<p class="deponent">Deponent</p>
<p class="transfer-heading">VERIFICATION</p>
<p>I, <strong>{{owner.nameWithRelation}}</strong> verify that the contents of the above affidavit are true and correct to the best of my knowledge and nothing have been concealed therein.</p>
<p class="deponent">Deponent</p>
</section>

<section data-letter-page="5" data-top="760">
<p class="transfer-title">TRANSFER LETTER</p>
<p class="transfer-refline"><span><strong>No. <span class="red-text">{{document.number}}</span></strong></span><span class="red-text"><strong>DATED: {{document.date}}</strong></span></p>
<p>To,</p>
<p class="center transfer-party"><u><strong>{{owner.nameWithRelation}}</strong></u><br>{{owner.addressMultilineHtml}}<br>PAN No. {{owner.panNo}}<br>Aadhaar No. {{owner.aadhaarNo}}</p>
<p class="transfer-subject"><span><strong>SUBJECT:</strong></span><span><strong>TRANSRFER OF RESIDENTIAL PLOT NO. {{plot.code}} MEASURING {{plot.areaSqyd}} SQ. YDS. SITUATED AT {{project.nameUpper}}.</strong></span></p>
<p>Respected Sir/Madam,</p>
<p>Reference to your application dated <strong>{{document.date}}</strong> on the subject cited above.</p>
<p>We are pleased to transfer in your favour plot no. <strong>{{plot.code}}</strong> at {{project.nameUpper}} measuring {{plot.areaSqyd}} Sq. Yds. The details of which are mentioned below:</p>
<table class="transfer-directions">
<tr><td>EAST SIDE</td><td>:</td><td>{{plot.eastSize}} {{plot.eastBoundary}}</td></tr>
<tr><td>WEST SIDE</td><td>:</td><td>{{plot.westSize}} {{plot.westBoundary}}</td></tr>
<tr><td>NORTH SIDE</td><td>:</td><td>{{plot.northSize}} {{plot.northBoundary}}</td></tr>
<tr><td>SOUTH SIDE</td><td>:</td><td>{{plot.southSize}} {{plot.southBoundary}}</td></tr>
</table>
<p>The above transfer has been made subject to the condition that you will be \`Mutatis Mutandis' bound to abide by the terms and conditions of original allotment letter no. <strong>{{original.allotmentNumber}}</strong> dated <strong>{{original.allotmentDate}}</strong>.</p>
<p class="signoff-firm">FOR {{firm.nameUpper}}</p>
<p class="signoff-partner">(PARTNER)</p>
</section>
</div>`;
}

export function registryStatusLetterTemplate() {
  return `<div data-letter-template="registry-status-letter">
<section data-letter-page="1" data-top="760">
<h1><u>Registry Status Letter</u></h1>
<p class="right">Letter No.: {{document.number}}<br>Date: {{document.date}}</p>
<p>To<br><u>{{owner.nameWithRelation}}</u><br><u>Resident of {{owner.address}}</u><br><u>Mobile No. {{owner.mobileNo}}</u></p>
<p><strong>Subject :-</strong> Registry status of Residential Plot No. <strong>{{plot.code}}</strong> of <strong>{{project.name}}, {{project.fullAddress}}</strong>.</p>
<p>This letter records the present registry status available in the project records of <strong>{{firm.name}}</strong> for the below mentioned plot.</p>
<table>
<tr><th>Project</th><td><strong>{{project.nameUpper}}</strong></td></tr>
<tr><th>Plot No.</th><td><strong>{{plot.code}}</strong></td></tr>
<tr><th>Plot Area</th><td><strong>{{plot.areaSqyd}} Sq. Yds. approx.</strong></td></tr>
<tr><th>Owner</th><td><strong>{{owner.nameWithRelationUpper}}</strong></td></tr>
<tr><th>Registry Status</th><td><strong>{{registry.status}}</strong></td></tr>
<tr><th>Registry No.</th><td><strong>{{registry.number}}</strong></td></tr>
<tr><th>Registry Date</th><td><strong>{{registry.date}}</strong></td></tr>
</table>
<p>The above status is based on the documents, receipts, registry details, and internal records available with the Firm as on the date of this letter. If any government record, registry deed, receipt, mutation, or related document is pending or later updated, the project records may be updated accordingly.</p>
<p>This letter is issued only for record and communication purposes. The original registry deed, registry receipt, and official government records shall remain the final proof wherever required under applicable law.</p>
<p class="right">For M/s. {{firm.nameUpper}}<br><br>Authorized Signatory</p>
</section>
</div>`;
}
